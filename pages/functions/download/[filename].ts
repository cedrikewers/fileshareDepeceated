interface Env {
    cloudStorage: R2Bucket;
	db : D1Database;
}

export const onRequestGet : PagesFunction<Env> = async (ctx) => {
    const path = new URL(ctx.request.url).pathname;
    const filename = ctx.params.filename as string;

	const key = "fileshare/" + btoa(filename);
	const file = await ctx.env.cloudStorage.get(key);
	if(!file){
		return new Response('404 - Not Found', { status: 404 });
	}
	return new Response(file.body, { headers: { 'content-type': 'application/octet-stream' } });
}

