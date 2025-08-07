import { CloudflareImagesClient } from 'cloudflare-images-client'
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

    console.log(`Cloudflare image storage initialized.`)

    if (!this.accountId) throw new Error('No Cloudflare Account ID provided')
    if (!this.apiToken) throw new Error('No Cloudflare API Token provided')
    if (!this.accountHash) throw new Error('No Cloudflare account hash provided')
  }

  async delete(fileName: string, targetDir?: string) {
    return true;
  }

  async exists(fileName: string, targetDir?: string) {
    return false;
  }

  cloudflare() {
    return new CloudflareImagesClient({
        accountId: this.accountId || '',
        apiToken: this.apiToken || '',
    })
  }

  isValidImage(image) {
    return image && image.name && image.path;
  }
  getCloudflareImageURL (id: string){
    return `https://imagedelivery.net/${this.accountHash}/${id}/public`
  }

  async save(image: Image, targetDir?: string) {
    if(!this.isValidImage(image)) throw new Error('Invalid image object. Image must have name and path.')

    try {
        const upload = await this.cloudflare().uploadImageFromFile({
            fileName: image.name,
            filePath: image.path,
            metadata: { ...image }
        })
        if (!upload.success || !upload.result) throw new Error(upload.errors.map(err=>err.message).join())
        console.log(`Upload result`, upload)
        return this.getCloudflareImageURL(upload.result.filename)
    } catch(err) {
        throw new Error(`Error during file save operation: ${err.message}`);
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