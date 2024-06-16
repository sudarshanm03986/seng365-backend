import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';



const getOne = async(
    id: number ): Promise<UserImage[]> => {
        Logger.info(`Getting user image by ${id} from the Database`);
        const conn = await getPool().getConnection();
        const query = 'SELECT image_filename FROM user WHERE id=?';
        const [rows] = await conn.query(query, [id]);
        await conn.release();
        return rows;
}

const alter = async(
    id: number,
    token: string,
    filename: string): Promise<ResultSetHeader> => {
        Logger.info(`Putting user image by ${id} and token to the Database`);
        const conn = await getPool().getConnection();
        const query = 'UPDATE user SET image_filename=? WHERE id=? AND auth_token=?';
        const [result] = await conn.query(query, [filename,id, token]);
        await conn.release();
        return result;
}

const remove = async(
    id: number,
    token: string): Promise<ResultSetHeader> => {
        Logger.info(`Deleting user image by ${id} and token to the Database`);
        const conn = await getPool().getConnection();
        const query = 'UPDATE user SET image_filename = null WHERE id = ? AND auth_token = ?';
        const [result] = await conn.query(query, [id, token]);
        await conn.release();
        return result;
}




export {getOne, alter, remove}