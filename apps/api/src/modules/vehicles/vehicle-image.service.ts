import { v2 as cloudinary } from 'cloudinary';
import { query } from '../../config/database';
import { getEnv } from '../../config/env';

export class VehicleImageService {
  private static isDbInitialized = false;

  private static async ensureDbInit() {
    if (this.isDbInitialized) return;
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS vehicle_images_cache (
          key VARCHAR(255) PRIMARY KEY,
          image_url TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      this.isDbInitialized = true;
    } catch (err) {
      console.error('[VehicleImageService] Failed to initialize DB table:', err);
    }
  }

  static async getImageUrl(make: string, model: string, year: string): Promise<string> {
    await this.ensureDbInit();
    const key = `${make.toLowerCase()}-${model.toLowerCase()}-${year.toLowerCase()}`.replace(/[^a-z0-9-]/g, '');

    // 1. Check Cache
    const cacheResult = await query('SELECT image_url FROM vehicle_images_cache WHERE key = $1', [key]);
    if (cacheResult.rows.length > 0) {
      const cachedUrl = cacheResult.rows[0].image_url;
      let isReachable = true;

      if (!cachedUrl) {
        isReachable = false;
      } else if (cachedUrl.startsWith('/uploads/')) {
        const fs = await import('fs');
        const path = await import('path');
        const localPath = path.join(process.cwd(), cachedUrl);
        if (!fs.existsSync(localPath)) {
          isReachable = false;
        }
      } else if (cachedUrl.startsWith('http')) {
        try {
          const check = await fetch(cachedUrl, { method: 'HEAD' });
          if (!check.ok) isReachable = false;
        } catch {
          isReachable = false;
        }
      } else {
        isReachable = false;
      }

      if (isReachable) {
        return cachedUrl;
      } else {
        console.warn(`[VehicleImageService] Cached URL for ${key} is unreachable. Deleting and regenerating.`);
        await query('DELETE FROM vehicle_images_cache WHERE key = $1', [key]);
      }
    }

    // 2. Try Wikipedia Fallbacks
    const wikiUrl = await this.fetchWikimediaImage(make, model, year);
    if (wikiUrl) {
      await this.cacheImage(key, wikiUrl);
      return wikiUrl;
    }

    // 3. Fallback to OpenAI DALL-E
    const openaiUrl = await this.generateDalleImage(make, model, year);

    // Upload to Cloudinary
    const cloudUrl = await this.uploadToCloudinary(openaiUrl, key);

    await this.cacheImage(key, cloudUrl);
    return cloudUrl;
  }

  private static async cacheImage(key: string, url: string) {
    await query(
      `INSERT INTO vehicle_images_cache (key, image_url) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET image_url = EXCLUDED.image_url`,
      [key, url]
    );
  }

  public static async validateVehicleImage(imageUrl: string, make: string, model: string, year: string): Promise<boolean> {
    const { generateObject } = await import('ai');
    const { createOpenAI } = await import('@ai-sdk/openai');
    const { z } = await import('zod');
    const env = getEnv();
    const apiKey = env.imageLlmProvider === 'groq' ? env.groqApiKey : env.openaiApiKey;
    const baseURL = env.imageLlmProvider === 'groq' ? 'https://api.groq.com/openai/v1' : undefined;

    if (!apiKey) return true; // fallback if no api key

    const aiProvider = createOpenAI({ apiKey, ...(baseURL ? { baseURL } : {}), fetch });

    try {
      // Wikimedia allows direct URL fetch, but if we pass URL directly to Groq/OpenAI, Groq vision doesn't support URLs yet.
      // OpenAI supports URLs, but to be safe and cross-provider compatible, fetch the image as base64.
      const response = await fetch(imageUrl);
      if (!response.ok) return false;
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';
      const dataUri = `data:${mimeType};base64,${base64}`;

      const { object } = await generateObject({
        model: aiProvider(env.imageLlmModel),
        schema: z.object({
          isValid: z.boolean(),
          reason: z.string()
        }),
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `You are an expert automotive image validator. Target vehicle: ${year} ${make} ${model}.
Rules:
1. You must definitively verify that the vehicle shown is EXACTLY a ${year} ${make} ${model}.
2. REJECT the image if it is a different model, a visually similar but incorrect car, a different generation, or a generic hatchback/sedan/SUV.
3. REJECT any image that is: a dealership, showroom, manufacturer building, logo, banner, advertisement, people, interior, engine, parts, license plate, or dealership entrance.
4. Accept ONLY images where the primary subject is the exact requested vehicle exterior.
Is this a valid exterior image of the exact target vehicle?` },
            {
              type: 'file',
              data: dataUri,
              mediaType: mimeType,
            },
          ],
        }],
      });
      return object.isValid;
    } catch (err) {
      console.error('[VehicleImageService] Image validation failed:', err);
      // If validation fails (e.g. Groq DNS error, rate limit), we MUST assume the Wikipedia image is valid.
      // Wikipedia search by "Year Make Model" is extremely accurate, and falling back to true prevents 
      // generating inaccurate generic AI cars when the LLM is down.
      return true;
    }
  }

  private static async fetchWikimediaImage(make: string, model: string, year: string): Promise<string | null> {
    // 1. Search for an exact vehicle image using: Make + Model + Year
    const q = `${year} ${make} ${model}`;
    
    try {
      const searchTerm = encodeURIComponent(q);
      const response = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&pithumbsize=960&generator=search&gsrsearch=${searchTerm}`);
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.query || !data.query.pages) return null;

      const pages = Object.values(data.query.pages) as any[];
      // Sort by search index to get most relevant first
      pages.sort((a, b) => (a.index || 0) - (b.index || 0));

      for (const page of pages) {
        if (page.thumbnail?.source) {
          const url = page.thumbnail.source;
          const isValid = await this.validateVehicleImage(url, make, model, year);
          if (isValid) {
            return url;
          }
        }
      }
    } catch (err) {
      console.error('[VehicleImageService] Wikimedia fetch error for query', q, err);
    }
    
    return null;
  }

  private static async generateDalleImage(make: string, model: string, year: string): Promise<string> {
    const env = getEnv();
    const prompt = `A highly accurate, perfectly realistic, professional dealership photograph of a stock ${year} ${make} ${model} car. Front three-quarter angle, bright daylight, plain background.`;

    try {
      if (env.openaiApiKey) {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: '1024x1024'
          })
        });

        if (response.ok) {
          const data = await response.json();
          return data.data[0].url;
        } else {
          const errText = await response.text();
          console.error('[VehicleImageService] OpenAI Error:', errText);
        }
      }
    } catch (err) {
      console.error('[VehicleImageService] OpenAI Fetch Error:', err);
    }

    console.log('[VehicleImageService] Falling back to Pollinations AI for image generation');
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&enhance=true`;
  }

  private static async uploadToCloudinary(imageUrl: string, publicId: string): Promise<string> {
    // Cloudinary automatically uses CLOUDINARY_URL env var if available
    try {
      const result = await cloudinary.uploader.upload(imageUrl, {
        public_id: `vehicles/${publicId}`,
        folder: 'wrectifai'
      });
      return result.secure_url;
    } catch (err) {
      console.error('[VehicleImageService] Cloudinary Upload Error:', err);
      // Fallback: download locally instead of using ephemeral OpenAI URL
      try {
        const fs = await import('fs');
        const path = await import('path');
        const fetchRes = await fetch(imageUrl);
        if (!fetchRes.ok) throw new Error('Failed to fetch from OpenAI');
        const buffer = await fetchRes.arrayBuffer();
        
        const uploadsDir = path.join(process.cwd(), 'uploads', 'vehicles');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const filename = `${publicId}-${Date.now()}.jpg`;
        const filePath = path.join(uploadsDir, filename);
        await fs.promises.writeFile(filePath, new Uint8Array(buffer));
        
        return `/uploads/vehicles/${filename}`;
      } catch (localErr) {
        console.error('[VehicleImageService] Local save error:', localErr);
        // Absolute last resort
        return imageUrl;
      }
    }
  }

  // Future Enhancement: Design for VIN decoding
  // static async decodeVinAndGetImage(vin: string): Promise<string> {
  //   // 1. Decode VIN to get make, model, year, trim
  //   // 2. return this.getImageUrl(make, model, year);
  // }
}
