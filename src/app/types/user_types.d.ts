type User = {
    id: number,
    email: string,
    first_name: string,
    last_name: string,
    image_filename: string,
    password: string,
    auth_token: string
}

type UserRequest = {
    id: number,
    email: string,
    first_name: string,
    last_name: string,
}

type AnotherUserRequest= {
    id: number,
    first_name: string,
    last_name: string,
}

type UserPassword = {
    id: number,
    password: string

}

type UserUpdate = {
    email: string,
    first_name: string,
    last_name: string,
    password: string,
    currentPassword: string
 
}

type UserImage = {
    image_filename: string
}

type UserToken = {
    id: number
    auth_token: string
}
