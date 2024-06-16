import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';

const insert = async(
    email: string,
    firstName: string,
    lastName: string,
    password: string
): Promise<ResultSetHeader> => {
    Logger.info(`Adding user ${firstName} ${lastName} to the Database`);
    const conn = await getPool().getConnection();
    const query = 'INSERT INTO user (email, first_name, last_name, password) VALUES (?)';
    const [result] = await conn.query(query, [[email, firstName, lastName, password]]);
    await conn.release();
    return result;
};


const findByEmail = async (
    email:string
): Promise<UserPassword[]> => {
    Logger.info(`Finding user by ${email} from the Database`);
    const conn = await getPool().getConnection();
    const query = 'SELECT id, password FROM user WHERE email=?';
    const [rows] = await conn.query(query, [email]);
    await conn.release();
    return rows;

}

const findByToken = async (
    token:string
): Promise<UserToken[]> => {
    Logger.info(`Finding user id by token from the Database`);
    const conn = await getPool().getConnection();
    const query = 'SELECT id, auth_token FROM user WHERE auth_token=?';
    const [rows] = await conn.query(query, [token]);
    await conn.release();
    return rows;
}

const setToken = async(
    id: number,
    token: string): Promise<ResultSetHeader> => {
    Logger.info(`Setting token to user by ${id}`)
    const conn = await getPool().getConnection();
    const query = 'UPDATE user SET auth_token = ? WHERE id = ?' ;
    const [result] = await conn.query(query, [token, id]);
    await conn.release();
    return result;


}

const getUser = async(
    id:number,
    token: string): Promise<UserRequest[]> => {
        Logger.info(`Getting user by ${id} and token from the Database`);
        const conn = await getPool().getConnection();
        const query = 'SELECT id, email, first_name, last_name FROM user WHERE id=? AND auth_token=?';
        const [rows] = await conn.query(query, [id, token]);
        await conn.release();
        return rows;
}

const getAnotherUser = async(
    id: number) :Promise<AnotherUserRequest[]> => {
        Logger.info(`Getting user by ${id} from the Database`);
        const conn = await getPool().getConnection();
        const query = 'SELECT id, first_name, last_name FROM user WHERE id=? ';
        const [rows] = await conn.query(query, [id]);
        await conn.release();
        return rows
    }



const alter = async(
    user: UserUpdate,
    id: number,
    token: string): Promise<ResultSetHeader> => {
    Logger.info(`Updating user id:${id} on the Database`);
    const conn = await getPool().getConnection();
    let query = 'UPDATE user SET';
    const list = [];

    if (user.email !== undefined) {
        query += ' email = ?'
        list.push(user.email)
    }

    if (user.first_name !== undefined) {
        query += list.length !== 0 ? ', ': ' ';
        query += 'first_name = ?'
        list.push(user.first_name)
    }

    if (user.last_name !== undefined) {
        query += list.length !== 0 ? ', ': ' ';
        query += 'last_name = ?'
        list.push(user.last_name)
    }

    if (user.password !== undefined) {
        query += list.length !== 0 ? ', ': ' ';
        query += 'password = ?'
        list.push(user.password)
    }

    query += ' WHERE id=? AND auth_token=?';
    list.push(id);
    list.push(token);
    const [result] = await conn.query(query, list);
    await conn.release();
    return result;
    }


const removeToken = async(
    token: string): Promise<ResultSetHeader> => {
    Logger.info(`Removing token from user`)
    const conn = await getPool().getConnection();
    const query = 'UPDATE user SET auth_token = null WHERE auth_token = ?' ;
    const [result] = await conn.query(query, [token]);
    await conn.release();
    return result;

}



export {insert, findByEmail, findByToken, setToken, getUser, getAnotherUser, alter, removeToken};