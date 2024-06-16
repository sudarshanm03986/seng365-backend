import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';



const getOne = async(
    petitionId: number ): Promise<PetitionImage[]> => {
        Logger.info(`Getting Petiton image by ${petitionId} from the Database`);
        const conn = await getPool().getConnection();
        const query = 'SELECT image_filename FROM petition WHERE id=?';
        const [rows] = await conn.query(query, [petitionId]);
        await conn.release();
        return rows;
}

const alter = async(
    petitionId: number,
    ownerId: number,
    filename: string): Promise<ResultSetHeader> => {
        Logger.info(`Putting Petition image by ${petitionId} and token to the Database`);
        const conn = await getPool().getConnection();
        const query = 'UPDATE petition SET image_filename = ? WHERE id = ? AND owner_id = ?';
        const [result] = await conn.query(query, [filename, petitionId, ownerId]);
        await conn.release();
        return result;
}

const remove = async(
    petitionId: number,
    ownerId: number): Promise<ResultSetHeader> => {
        Logger.info(`Deleting Petition image by ${petitionId} and token to the Database`);
        const conn = await getPool().getConnection();
        const query = 'UPDATE petition SET image_filename = null WHERE id = ? AND owner_id = ?';
        const [result] = await conn.query(query, [petitionId, ownerId]);
        await conn.release();
        return result;
}




export {getOne, alter, remove}