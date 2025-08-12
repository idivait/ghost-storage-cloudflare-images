import { createReadStream } from "fs"
import CloudflareImagesClient, { APIError } from 'cloudflare'
import StorageBase, { type ReadOptions, type Image } from 'ghost-storage-base'

type Config = {
  accountId?: string
  apiToken?: string
  accountHash?: string
}

class CloudflareStorage extends StorageBase {
  accountId?: string
  apiToken?: string
  accountHash?: string

  constructor(config: Config = {}) {
    super()

    const {
      accountId,
      apiToken,
      accountHash,
    } = config

    // Compatible with the cloudflare image client's default environment variables
    this.accountId = accountId
    this.apiToken = apiToken
    this.accountHash = accountHash

    if (!this.accountId) throw new Error('No Cloudflare Account ID provided')
    if (!this.apiToken) throw new Error('No Cloudflare API Token provided')
    if (!this.accountHash) throw new Error('No Cloudflare account hash provided')
  }

  async delete(fileName: string, targetDir?: string) {
    console.warn(`filename`, fileName)
    return true;
  }

  async exists(fileName: string, targetDir?: string) {
    console.warn(`filename`, fileName)
    return false;
  }

  cloudflare() {
    return new CloudflareImagesClient({
      apiToken: this.apiToken
    })
  }

  isValidImage(image) {
    return image && image.name && image.path;
  }

  getCloudflareImageURL (id: string){
    return `https://imagedelivery.net/${this.accountHash}/${id}/public`
  }

  getCloudflareImageID (url: string){
    const regex = /https:\/\/imagedelivery.net\/(?<accounthash>.*)\/(?<id>.*)\/public/
    const match = regex.exec(url)
    if(!match?.groups?.id) return null
    return match.groups.id
  }

  handleApiErrors (error: Error){
    if (error instanceof CloudflareImagesClient.APIError) {
      const apiError = error as APIError
      console.log(apiError.status) // 400
      console.log(apiError.name) // BadRequestError
      console.log(apiError.headers) // {server: 'nginx', ...}
    } else {
      throw error
    }
  }

  async save(image: Image, targetDir?: string) {
    console.warn(`image`, image)
    if(!this.isValidImage(image)) throw new Error('Invalid image object. Image must have name and path.')

    try {
        // const upload = await client.uploadImageFromFile({
        //     fileName: image.name,
        //     filePath: image.path,
        //     metadata: { ...image }
        // })

        const upload = await this.cloudflare().images.v1.create({
          account_id: this.accountId || '',
          id: image.name,
          file: createReadStream(image.path),
          metadata: {...image},
        }).catch(this.handleApiErrors)

        if(!upload?.id) throw new Error(`No image id found. Image: ${image && JSON.stringify(image)}`)
          
        return this.getCloudflareImageURL(upload.id)
    } catch(err) {
        throw new Error(`Error during file save operation: ${err.message} `);
    }
    
  }

  serve() {
    return function (req, res, next) {
      next();
    };
  }

  async read(options: ReadOptions = { path: '' }) {
    throw new Error(`${options.path} not readable`);
    return Buffer.from('');
  }
}

export default CloudflareStorage