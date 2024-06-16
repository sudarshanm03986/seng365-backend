type PetitionRequest = {
    "petitionId": number,
    "title": string,
    "categoryId": number,
    "ownerId": number,
    "ownerFirstName" : string,
    "ownerLastName" : string,
    "creationDate" : string,
    "moneyRaised" : number,
    "description": string
}

type PetitionQuery = {
    "q": string| null,
    "ownerId": number| null,
    "supporterId": number| null,
    "supportingCost": number| null,
    "sortBy": string| null,
}

type supportTiersCreate = {
    "title" : string,
    "description": string,
    "cost": number
}

type PetitionUpdate = {
    "title" : string,
    "description" : string,
    "categoryId": number
}

type CategoryRequest = {
    "id": number,
    "name": string
}



type RequestSupporter = {
    "supportId": number,
    "supportTierId": number,
    "message": string,
    "supporterId": number,
    "supporterFirstName": string,
    "supporterLastName": string,
    "timestamp": string
}

type SupporterRequest = {
    "petition_id": number
}

type SupportTierRequest = {
    "supportTierId":number
    "title": string,
    "description": string,
    "cost": number
}

type PetitionImage = {
    image_filename: string
}