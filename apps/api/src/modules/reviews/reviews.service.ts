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
      `UPDATE garages SET rating = $1, review_count = $2 WHERE id = $3`,
      [avgRating, count, garageId]
    );
  }

  static async getReviewsByGarage(garageId: string, currentUserId?: string) {
    // We fetch reviews along with likes count, replies count, and whether the current user liked it
    const res = await query(
      `SELECT 
        r.id, r.garage_id, r.customer_name, r.customer_id, r.rating, r.text as comment, r.created_at,
        r.likes_count, r.unlikes_count, r.replies_count,
        u.first_name, u.last_name,
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
       WHERE r.garage_id = $1
       ORDER BY r.created_at DESC`,
      [garageId, currentUserId || null]
    );

    // Fetch replies for each review
    const reviewIds = res.rows.map((r: any) => r.id);
    let repliesByReviewId: Record<string, any[]> = {};
    
    if (reviewIds.length > 0) {
      const repliesRes = await query(
        `SELECT rr.id, rr.review_id, rr.text, rr.created_at, 
                rr.user_id, rr.garage_id,
                u.first_name, u.last_name,
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
          authorName: reply.garage_id ? reply.garage_name : `${reply.first_name} ${reply.last_name}`,
          isGarageOwner: !!reply.garage_id
        });
      }
    }

    return res.rows.map((r: any) => ({
      id: r.id,
      garageId: r.garage_id,
      customerId: r.customer_id,
      customerName: r.customer_id ? `${r.first_name} ${r.last_name}` : r.customer_name,
      rating: parseFloat(r.rating),
      comment: r.comment,
      createdAt: r.created_at,
      likesCount: r.likes_count || 0,
      unlikesCount: r.unlikes_count || 0,
      repliesCount: r.replies_count || 0,
      isLikedByUser: r.isLikedByUser,
      isUnlikedByUser: r.isUnlikedByUser,
      replies: repliesByReviewId[r.id] || []
    }));
  }

  static async createReview(garageId: string, customerId: string, customerName: string, rating: number, text: string) {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const res = await client.query(
        `INSERT INTO garage_reviews (garage_id, customer_id, customer_name, rating, text, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
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
      await client.query('COMMIT');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
