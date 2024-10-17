export type CometRequest = {
	url: URL
	method: string
	contentType: string | null

	args: Record<string, any>
	params: Record<string, string>
	files: Record<string, Array<File>>
	headers: Record<string, string>
	cookies: Record<string, string>
}