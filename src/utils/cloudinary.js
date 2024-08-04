import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";
(async function() {

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    // Upload an image
    //  const uploadResult = await cloudinary.uploader
    //    .upload(
    //        'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
    //            public_id: 'shoes',
    //        }
    //    )
    //    .catch((error) => {
    //        console.log(error);
    //    });
    const  uploadOnCloundinary=async (localFilePath)=>{
        try {
            if(!localFilePath) return null
            //upload file on cloudinary
            const response= await cloudinary.uploader.upload(localFilePath,{
                resource_type:"auto"
            })
            console.log("File is uploaded on cloudinary",response.url);
            return response;
        } catch (error) {
            fs.unlinkSync(localFilePath)//remove the locally saved temporary file as teh upload operation got failed.
        }
    }
})();

export {uploadOnCloundinary}