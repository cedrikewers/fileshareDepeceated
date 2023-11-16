export namespace Authentication {

    enum AuthScope {
        UploadFileshare = 50
    }
    
    export function authenticate(token: string) : boolean{
        return false;
    }

    export function login(password: string, username: string) : string | null {

        return null;
    }
}