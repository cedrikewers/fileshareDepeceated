interface Env {
    cloudStorage: R2Bucket;
	db : D1Database;
}

export const onRequestPost:  PagesFunction<Env> = async (ctx) => {

    const url = new URL(ctx.request.url);
    const key = ctx.params.key as string;

    try{
        const uploadId = url.searchParams.get('uploadId') || '';

        const mpUpload = ctx.env.cloudStorage.resumeMultipartUpload(key, uploadId);

        interface completeBody {
            parts: R2UploadedPart[];
        }

        const completeBody: completeBody = await ctx.request.json();
        console.log(JSON.stringify(completeBody));
        const object = await mpUpload.complete(completeBody.parts);
        return new Response(null, {
            headers: {
                etag: object.httpEtag,
            },
        });
    }
    catch(e : any){
        return new Response(JSON.stringify({error: e.message}), { status: 500 });
    }
}