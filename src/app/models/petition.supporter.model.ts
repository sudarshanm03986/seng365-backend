import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';



const getAllByPetitionId = async(
    petitionId: number
): Promise <RequestSupporter[]> => {
    Logger.info('Getting all the Supporter');
    const conn =  await getPool().getConnection();
    const query = `SELECT
            S.id as supportId,
            S.support_tier_id as supportTierId,
            S.message as message,
            S.user_id as supporterId,
            U.first_name as supporterFirstName,
            U.last_name as supporterLastName,
            timestamp
            FROM supporter S join user U on S.user_id =  U.id
            WHERE petition_id = ?
            ORDER By timestamp DESC`;
    const [rows] = await conn.query(query, [petitionId]);
    await conn.release();
    return rows;
}

const insert =  async (
    petitionId: number,
    tierId: number,
    userId: number,
    message: string ): Promise<ResultSetHeader> => {
    Logger.info('Insert a new Supporter');
    const conn =  await getPool().getConnection();
    const query = `INSERT INTO supporter
                    (petition_id, support_tier_id, user_id, message, timestamp)
                    VALUES (?)`;
    const date = new Date();
    const [result] = await conn.query(query, [[petitionId, tierId, userId, message, date]]);
    await conn.release();
    return result;



    }



export {getAllByPetitionId, insert}