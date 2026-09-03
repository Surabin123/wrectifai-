import { query, getDbPool } from '../../config/database';

export class ReviewsService {
  /**
   * Calculate and update the cached average rating and review count for a garage.
   * "Prefer calculating average rating/count from the actual persisted reviews so there is no stale rating data."
   */
  static async updateGarageRating(garageId: string, client?: any) {
    const q = client ? client.query.bind(client) : query;
    const res = await q(
      `SELECT COUNT(*) as count, COALESCE(AVG(rating), 0) as avg_rating
       FROM garage_reviews
       WHERE garage_id = $1`,
      [garageId]
    );

    const count = parseInt(res.rows[0].count, 10);
    const avgRating = parseFloat(res.rows[0].avg_rating).toFixed(1);

    await q(
      `UPDATE garages SET rating_avg = $1, rating_count = $2 WHERE id = $3`,
      [avgRating, count, garageId]
    );
  }

  static async getReviewsByGarage(garageId: string, currentUserId?: string, page = 1, limit = 10, sortBy = 'newest') {
    const offset = (page - 1) * limit;

    // Get total count
    const countRes = await query(
      `SELECT COUNT(*) as count FROM garage_reviews WHERE garage_id = $1 AND (is_hidden = FALSE OR is_hidden IS NULL)`,
      [garageId]
    );
    const total = parseInt(countRes.rows[0].count, 10);

    let orderClause = 'ORDER BY r.created_at DESC';
    if (sortBy === 'highest') orderClause = 'ORDER BY r.rating DESC';
    else if (sortBy === 'lowest') orderClause = 'ORDER BY r.rating ASC';

    // Fetch paginated reviews along with likes count, replies count, and whether the current user liked it
    const res = await query(
      `SELECT 
        r.id, r.garage_id, r.customer_name, r.customer_id, r.rating, r.text as comment, r.created_at,
        r.likes_count, r.unlikes_count, r.replies_count,
        u.name as u_name,
        EXISTS (
          SELECT 1 FROM garage_review_likes grl 
          WHERE grl.review_id = r.id AND grl.customer_id = $2 AND grl.vote_type = 'like'
        ) as "isLikedByUser",
        EXISTS (
          SELECT 1 FROM garage_review_likes grl 
          WHERE grl.review_id = r.id AND grl.customer_id = $2 AND grl.vote_type = 'unlike'
        ) as "isUnlikedByUser"
       FROM garage_reviews r
       LEFT JOIN users u ON r.customer_id = u.id
       WHERE r.garage_id = $1 AND (r.is_hidden = FALSE OR r.is_hidden IS NULL)
       ${orderClause}
       LIMIT $3 OFFSET $4`,
      [garageId, currentUserId || null, limit, offset]
    );

    // Fetch replies for each paginated review
    const reviewIds = res.rows.map((r: any) => r.id);
    const repliesByReviewId: Record<string, any[]> = {};
    
    if (reviewIds.length > 0) {
      const repliesRes = await query(
        `SELECT rr.id, rr.review_id, rr.text, rr.created_at, 
                rr.user_id, rr.garage_id,
                u.name as u_name,
                g.name as garage_name
         FROM garage_review_replies rr
         LEFT JOIN users u ON rr.user_id = u.id
         LEFT JOIN garages g ON rr.garage_id = g.id
         WHERE rr.review_id = ANY($1)
         ORDER BY rr.created_at ASC`,
        [reviewIds]
      );
      
      for (const reply of repliesRes.rows) {
        if (!repliesByReviewId[reply.review_id]) repliesByReviewId[reply.review_id] = [];
        repliesByReviewId[reply.review_id].push({
          id: reply.id,
          text: reply.text,
          createdAt: reply.created_at,
          authorName: reply.garage_id ? reply.garage_name : (reply.u_name || 'Anonymous User'),
          isGarageOwner: !!reply.garage_id
        });
      }
    }

    const data = res.rows.map((r: any) => ({
      id: r.id,
      garageId: r.garage_id,
      customerId: r.customer_id,
      customerName: r.customer_id ? (r.u_name || r.customer_name) : r.customer_name,
      rating: parseFloat(r.rating),
      comment: r.comment,
      createdAt: r.created_at,
      likesCount: r.likes_count || 0,
      unlikesCount: r.unlikes_count || 0,
      replies: repliesByReviewId[r.id] || []
    }));

    const distribution = {
      1: { count: 0, pct: '0%' },
      2: { count: 0, pct: '0%' },
      3: { count: 0, pct: '0%' },
      4: { count: 0, pct: '0%' },
      5: { count: 0, pct: '0%' }
    };
    
    let averageRating = 0;

    if (total > 0) {
      const statsRes = await query(
        `SELECT rating, COUNT(*) as count FROM garage_reviews WHERE garage_id = $1 AND (is_hidden = FALSE OR is_hidden IS NULL) GROUP BY rating`,
        [garageId]
      );
      
      let totalStars = 0;
      statsRes.rows.forEach((row: any) => {
        const star = Math.round(Number(row.rating));
        const count = Number(row.count);
        totalStars += Number(row.rating) * count;
        if (star >= 1 && star <= 5) {
          distribution[star as 1|2|3|4|5].count += count;
        }
      });
      averageRating = totalStars / total;
      
      for (let i = 1; i <= 5; i++) {
        distribution[i as 1|2|3|4|5].pct = Math.round((distribution[i as 1|2|3|4|5].count / total) * 100) + '%';
      }
    }

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: { averageRating: averageRating.toFixed(1), distribution }
    };
  }

  static async createReview(garageId: string, customerId: string, customerName: string, rating: number, text: string) {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const res = await client.query(
        `INSERT INTO garage_reviews (garage_id, customer_id, customer_name, rating, text, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (garage_id, customer_id) 
         DO UPDATE SET rating = EXCLUDED.rating, 
                       text = CASE WHEN EXCLUDED.text <> '' THEN EXCLUDED.text ELSE garage_reviews.text END,
                       created_at = NOW()
         RETURNING *`,
        [garageId, customerId, customerName, rating, text]
      );
      
      await ReviewsService.updateGarageRating(garageId, client);
      await client.query('COMMIT');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async voteReview(reviewId: string, customerId: string, voteType: 'like' | 'unlike' | 'none') {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check existing vote
      const existingVoteRes = await client.query(
        `SELECT vote_type FROM garage_review_likes WHERE review_id = $1 AND customer_id = $2`,
        [reviewId, customerId]
      );

      const existingVote = existingVoteRes.rows.length > 0 ? existingVoteRes.rows[0].vote_type : 'none';

      if (existingVote === voteType) {
        await client.query('ROLLBACK');
        return; // Nothing to do
      }

      // Decrement old count if existed
      if (existingVote === 'like') {
        await client.query(`UPDATE garage_reviews SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1`, [reviewId]);
      } else if (existingVote === 'unlike') {
        await client.query(`UPDATE garage_reviews SET unlikes_count = GREATEST(unlikes_count - 1, 0) WHERE id = $1`, [reviewId]);
      }

      if (voteType === 'none') {
        await client.query(`DELETE FROM garage_review_likes WHERE review_id = $1 AND customer_id = $2`, [reviewId, customerId]);
      } else {
        await client.query(
          `INSERT INTO garage_review_likes (review_id, customer_id, vote_type) 
           VALUES ($1, $2, $3)
           ON CONFLICT (review_id, customer_id) DO UPDATE SET vote_type = $3`,
          [reviewId, customerId, voteType]
        );
        
        if (voteType === 'like') {
          await client.query(`UPDATE garage_reviews SET likes_count = likes_count + 1 WHERE id = $1`, [reviewId]);
        } else if (voteType === 'unlike') {
          await client.query(`UPDATE garage_reviews SET unlikes_count = unlikes_count + 1 WHERE id = $1`, [reviewId]);
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async replyToReview(reviewId: string, userId: string, text: string, isGarageOwner: boolean, garageId: string | null) {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const res = await client.query(
        `INSERT INTO garage_review_replies (review_id, user_id, garage_id, text, created_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
        [reviewId, isGarageOwner ? null : userId, isGarageOwner ? garageId : null, text]
      );

      await client.query(`UPDATE garage_reviews SET replies_count = replies_count + 1 WHERE id = $1`, [reviewId]);
      const reply = res.rows[0];
      
      let authorName = 'Anonymous User';
      if (isGarageOwner && garageId) {
        const garageRes = await client.query('SELECT name FROM garages WHERE id = $1', [garageId]);
        if (garageRes.rows.length > 0) authorName = garageRes.rows[0].name;
      } else if (userId) {
        const userRes = await client.query('SELECT name FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length > 0) authorName = userRes.rows[0].name;
      }

      const formattedReply = {
        id: reply.id,
        text: reply.text,
        createdAt: reply.created_at,
        authorName,
        isGarageOwner: !!reply.garage_id
      };

      await client.query('COMMIT');
      return formattedReply;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getAllReviews() {
    const res = await query(
      `SELECT 
        r.id, r.garage_id, r.customer_name, r.customer_id, r.rating, r.text as comment, r.created_at, r.is_hidden,
        r.likes_count, r.unlikes_count, r.replies_count,
        u.name as u_name,
        g.name as garage_name
       FROM garage_reviews r
       LEFT JOIN users u ON r.customer_id = u.id
       LEFT JOIN garages g ON r.garage_id = g.id
       ORDER BY r.created_at DESC`
    );

    return res.rows.map((r: any) => ({
      id: r.id,
      garageId: r.garage_id,
      garageName: r.garage_name,
      customerId: r.customer_id,
      customerName: r.customer_id ? (r.u_name || r.customer_name) : r.customer_name,
      rating: parseFloat(r.rating),
      comment: r.comment,
      createdAt: r.created_at,
      isHidden: !!r.is_hidden,
      likesCount: r.likes_count || 0,
      unlikesCount: r.unlikes_count || 0,
      repliesCount: r.replies_count || 0
    }));
  }

  static async hideReview(reviewId: string) {
    const res = await query(
      `UPDATE garage_reviews SET is_hidden = TRUE WHERE id = $1 RETURNING *`,
      [reviewId]
    );
    return res.rows[0];
  }
}
