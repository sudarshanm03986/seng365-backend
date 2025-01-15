
import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';


const getAll = async(
    queryParams:PetitionQuery,
    categoryId : string | null): Promise<PetitionRequest[]> => {
        Logger.info(`Getting all Petition depending on the criteria`);
        const conn = await getPool().getConnection();
        let query = `SELECT P.id as petitionId,
                            P.title as title ,
                            category_id as categoryId,
                            owner_id as ownerId,
                            first_name as ownerFirstName,
                            last_name as ownerLastName,
                            creation_date as creationDate,
                            min(cost) as supportingCost
                        FROM petition P JOIN user U ON P.owner_id = U.id JOIN support_tier T ON P.id = T.petition_id `;

        // ======== WHERE======================
        if (queryParams.q !== null || queryParams.supporterId !== null || queryParams.ownerId !== null || categoryId !== null ) {
                query += 'WHERE '
                let andNeeded = false;

            if (queryParams.q !== null) {
                query += "P.description LIKE '%" + queryParams.q + "%' ";
                andNeeded = true;
            }

            if (queryParams.supporterId !== null) {
                query += (andNeeded ? 'AND ' : '') + 'S.user_id = '+ queryParams.supporterId + ' ';
                andNeeded = true;
            }

            if (queryParams.ownerId !== null) {
                query += (andNeeded ? 'AND ' : '') + 'P.owner_id = '+ queryParams.ownerId + ' ';
                andNeeded = true;
            }


            if (categoryId !== null) {


                query += (andNeeded ? 'AND ' : '') + 'P.category_id in '+ categoryId + ' ';
                andNeeded = true;


            }
        }

        query += 'GROUP BY petitionId ';

        // ========== HAVING ===================
        if (queryParams.supportingCost !== null) {
            query += 'HAVING supportingCost <= ' +   queryParams.supportingCost + ' ';
        }

        // ======== ORDER BY ==================
        query += 'ORDER BY ';


        if (queryParams.sortBy !== null) {
            if ('ALPHABETICAL_ASC' === queryParams.sortBy){
                query += 'title ASC ';
            }
            else if ('ALPHABETICAL_DESC' === queryParams.sortBy){
                query += 'title DESC ';
            }
            else if ('COST_ASC' === queryParams.sortBy) {
                query += 'supportingCost ASC, petitionId';
            }
            else if ( 'COST_DESC' === queryParams.sortBy ) {
                query += 'supportingCost DESC, petitionId';
            }
            else if ( 'CREATED_ASC' === queryParams.sortBy ) {
                query += 'creation_date ASC ';
            }
            else if ( 'CREATED_DESC' === queryParams.sortBy ) {
                query += 'creation_date DESC, ';
            }
        } else {

            query += 'creation_date ';

        }



        const [rows] = await conn.query(query);
        await conn.release();
        return rows as PetitionRequest[];
}


const getOne = async(
    id: number ): Promise<PetitionRequest[]> => {
        Logger.info(`Getting Petition by ${id} from the Database`);
        const conn = await getPool().getConnection();
        const query = `SELECT P.id as petitionId,
                            P.title as title ,
                            P.category_id as categoryId,
                            U.id as ownerId,
                            U.first_name as ownerFirstName,
                            U.last_name as ownerLastName,
                            P.creation_date as creationDate,
                            P.description as description,
                            CAST(COALESCE(SUM(T.cost), 0) AS float) as moneyRaised
                            FROM petition P INNER JOIN user U ON P.owner_id = U.id
                            LEFT OUTER JOIN supporter S on P.id = S.petition_id
                            LEFT OUTER JOIN support_tier T ON S.support_tier_id = T.id
                            WHERE P.id = ?`;
        const [rows] = await conn.query(query, [id]);
        await conn.release();
        return rows[0].petitionId === null ? [undefined] : rows;
}

const insertPetition = async(
    title: string,
    description: string,
    ownerId: number,
    categoryId: number): Promise<ResultSetHeader> => {
    Logger.info(`Inserting New petition to database`)
    const date = new Date();
    const conn = await getPool().getConnection();
    const query = 'INSERT INTO petition (title, description, creation_date, owner_id, category_id) VALUES (?)' ;
    const [result] = await conn.query(query, [[title, description, date , ownerId, categoryId ]]);
    await conn.release();
    return result;

}


const alter = async(
    petition: PetitionUpdate,
    owner: UserToken,
    id: number) : Promise<ResultSetHeader> => {
    Logger.info(`Updating New petition data to database`)
    const conn = await getPool().getConnection();
    let query = 'UPDATE petition SET';
    const list = [];

    if (petition.title !== undefined) {
        query += ' title = ?';
        list.push(petition.title );
    }

    if (petition.description !== undefined) {
        query += list.length === 0 ? ' ' : ', '
        query += 'description = ?';
        list.push(petition.description );
    }

    if (petition.categoryId !== undefined) {
        query += list.length === 0 ? ' ' : ', '
        query += ' category_id = ?';
        list.push( petition.categoryId );
    }

    query += ' WHERE owner_id = ? AND id = ?';

    list.push(owner.id);
    list.push(id);

    const [result] = await conn.query(query, list);
    await conn.release();
    return result;

}

const remove = async(
    petitionId: number,
    ownerId: number): Promise<ResultSetHeader> => {
    Logger.info(`Deleting petiton from the database`)
    const conn = await getPool().getConnection();
    const query = 'DELETE FROM petition where id = ? and owner_id = ?';
    const [result] = await conn.query(query, [petitionId, ownerId]);
    await conn.release();
    return result;


}

const categories = async(): Promise<CategoryRequest[]> => {
    Logger.info(`Getting all the categories`);
    const conn = await getPool().getConnection();
    const query = 'SELECT * FROM category ';
    const [rows] = await conn.query(query);
    await conn.release();
    return rows;
}





export {getAll, getOne, categories, insertPetition, alter, remove}
