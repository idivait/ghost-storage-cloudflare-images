import { createReadStream } from "fs"
import CloudflareImagesClient, { APIError } from 'cloudflare'
import StorageBase, { type ReadOptions, type Image } from 'ghost-storage-base'

type Config = {
  accountId?: string
  apiToken?: string
  accountHash?: string
}

interface CloudflareImage extends Image {
  originalname: string,
  encoding: string,
  fieldname: string,
  filename: string,
  mimetype: string,
  destination: string,
  size: number,
  type: string,
  ext: string
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

    this.accountId = accountId
    this.apiToken = apiToken
    this.accountHash = accountHash

    if (!this.accountId) throw new Error('No Cloudflare Account ID provided')
    if (!this.apiToken) throw new Error('No Cloudflare API Token provided')
    if (!this.accountHash) throw new Error('No Cloudflare account hash provided')
  }

  // This never gets called for some reason
  async delete(fileName: string, targetDir?: string) {
    console.warn(`filename`, fileName)
    try {
      await this.cloudflare().images.v1.delete(fileName, { account_id: this.accountId || '' })
      return true
    } catch(err){
      console.warn(err)
      return false
    }
  }

  // No idea why or when this is called in the application, but I'm using it in the code regardless.
  async exists(fileName: string, targetDir?: string) {
    try {
      await this.cloudflare().images.v1.get(fileName, { account_id: this.accountId || ""})
      return true
    } catch(err) {
      return false
    }
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

      throw error
    } else {
      throw error
    }
  }

  async save(image: CloudflareImage, targetDir?: string) {
    const fileName = this.getUniqueFileName(image, '')
    if(!this.isValidImage(image)) throw new Error('Invalid image object. Image must have name and path.')
    if(await this.exists(fileName)) return this.getCloudflareImageURL(fileName)

    const config: CloudflareImagesClient.Images.V1.V1CreateParams = {
      account_id: this.accountId || '',
      id: fileName,
      file: createReadStream(image.path),
      metadata: JSON.stringify(image)
    }

    const upload = await this.cloudflare().images.v1.create(config).catch(this.handleApiErrors)
    if(!upload?.id) throw new Error(`No image id found. Image: ${image && JSON.stringify(image)}`)
    return this.getCloudflareImageURL(upload.id)
  }

  serve() {
    return function (req, res, next) {
      next();
    };
  }

  // This is also never used. I don't know the point of these.
  async read(options: ReadOptions = { path: '' }) {
    throw new Error(`${options.path} not readable`);
    return Buffer.from('');
  }
}

export default CloudflareStorage