import { CloudflareImagesClient } from 'cloudflare-images-client'
import StorageBase, { type ReadOptions, type Image } from 'ghost-storage-base'
import logging from '@tryghost/logging';

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

    logging.info(`Cloudflare image storage initialized.`)

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

  cloudflareConfig() {
    const config = {
        accountId: this.accountId || '',
        apiToken: this.apiToken || '',
    }
    return config
  }

  isValidImage(image) {
    return image && image.name && image.path;
  }
  getCloudflareImageURL (id: string){
    return `https://imagedelivery.net/${this.accountHash}/${id}/public`
  }

  async save(image: Image, targetDir?: string) {
    logging.info("Atempting to save...")
    if(!this.isValidImage(image)) throw new Error('Invalid image object. Image must have name and path.')

    try {
        const config = this.cloudflareConfig()
        const client = new CloudflareImagesClient(config)
        console.warn(`config`, config)
        console.warn(`client`, client)
        const upload = await client.uploadImageFromFile({
            fileName: image.name,
            filePath: image.path,
            metadata: { ...image }
        })
        console.warn(`upload`, upload)
        logging.info(`Upload result`, JSON.stringify(upload))
        if (!upload.success || !upload.result) throw new Error(upload.errors.map(err=>err.message).join())
        return this.getCloudflareImageURL(upload.result.filename)
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