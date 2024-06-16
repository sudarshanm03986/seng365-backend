import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';


const getByPetition = async(
    id: number): Promise<SupportTierRequest[]> => {
    Logger.info('Getting all the Support Tier that is for Petiton:' + id);
    const conn =  await getPool().getConnection();
    const query = 'SELECT id as supportTierId, title, description, cost FROM support_tier WHERE petition_id = ?';
    const [rows] = await conn.query(query, [id]);
    await conn.release();
    return rows;
}

const insert = async(
    tier: supportTiersCreate,
    id: number ): Promise<ResultSetHeader> => {
    Logger.info(`Inserting New Support Tiers to database`)
    const conn = await getPool().getConnection();
    const query = 'INSERT INTO support_tier (petition_id, title, description, cost) VALUES ( ?, ?, ?, ?)';
    const [result] = await conn.query(query, [id, tier.title, tier.description, tier.cost]);
    await conn.release();
    return result;
}

const alter = async(
    petitionId: number,
    tierId: number,
    tier: supportTiersCreate):Promise<ResultSetHeader> => {
    Logger.info(`Patching  Support Tiers to database`)
    const conn = await getPool().getConnection();
    let query = 'UPDATE support_tier SET ';
    const list = []


    if (tier.title !== undefined) {
        query += 'title = ? ';
        list.push(tier.title);
    }

    if (tier.description !== undefined) {
        query += list.length === 0 ? '' : ', ';
        query += 'description = ? ';
        list.push(tier.description);
    }

    if (tier.cost !== undefined) {
        query += list.length === 0 ? '' : ', ';
        query += 'cost = ? ';
        list.push(tier.cost);
    }

    query += 'WHERE id = ? AND petition_id = ? ';
    list.push(tierId);
    list.push(petitionId);

    const [result] = await conn.query(query, list);
    await conn.release();
    return result;

}

const remove = async(
    tierId: number,
    petitionId: number): Promise<ResultSetHeader> => {
    Logger.info(`Deleting Support Teir from the database`)
    const conn = await getPool().getConnection();
    const query = 'DELETE FROM support_tier WHERE id = ? AND petition_id = ?';
    const [result] = await conn.query(query, [tierId, petitionId]);
    await conn.release();
    return result;


}

export {getByPetition, insert, alter, remove}