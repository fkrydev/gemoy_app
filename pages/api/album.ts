import type { NextApiRequest, NextApiResponse } from "next";
import { Database } from '../../lib/mongodb';
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from 'dotenv'
import { ObjectId } from "mongodb";
import {unlink} from 'fs'
dotenv.config()
import { initializeApp } from "firebase/app";
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes, uploadBytesResumable } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyA-sZdPouVcB6JA4D5pWCqY49BOwZnYGRw",
    authDomain: "gemoy-app.firebaseapp.com",
    projectId: "gemoy-app",
    storageBucket: "gemoy-app.appspot.com",
    messagingSenderId: "948407186459",
    appId: "1:948407186459:web:3b99013d2812e2231d74be",
    measurementId: "G-40DF94QGPP"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app, 'gs://gemoy-app.appspot.com');

const handlefileremove = (err:any)=>{
    if(err){
        console.log(err)

    }else{
        console.log('removed')
    }
}

export default async function handler(req:NextApiRequest, res:NextApiResponse){
   

    if(req.method?.toLowerCase() == 'post'){
        if(req.cookies.token){
            const verify = jwt.verify(req.cookies.token, process.env.SECRET_KEY! ) as JwtPayload
            let isValidFile = true;
            for(let file of req.body.files){
                if(file.filetype == 'image/jpg' || file.filetype == 'image/png'|| file.filetype == 'image/jpeg' || file.filetype == 'video/mp4'){
                    console.log(file.filetype)
                }else{
                    isValidFile=false
                    break
                }
            }
            if(req.body.title && req.body.files.length > 0 && req.body.caption){
                if(isValidFile == true){
                    const Post = Database('posts');
                    (await Post).findOne({title:req.body.title}).then(async (result)=>{
                        if(result){
                            return res.json({
                                code:400,
                                message:'Title Already Taken'
                            })
                        }else{
                            (await Post).insertOne({
                                username:verify.username,
                                title:req.body.title,
                                files:req.body.files,
                                caption:req.body.caption,
                                lastModified:new Date()
                            }).then((result)=>{
                                if(result){
                                    res.json({
                                        code:200,
                                        message:'Album Created',
                                        data:result
                                    })
                                }
                            })
                        }
                    });
                }else{
                    res.json({
                        code:400,
                        message:'Invalid file format'
                    })
                }
            }else{
                res.json({
                    code:400,
                    message:"All field Required!"
                })
            }
        }else{
            res.json({
                code:400,
                message:'Auth failed'
            })
        }
        
        
    }

    if(req.method?.toLowerCase() == 'put'){
        const Post = Database('posts');
        (await Post).updateOne({title:req.body.title}, {$set: {files:req.body.files}}, {upsert:true}).then((result)=>{
            if(result){
                res.json({
                    code:200,
                    message:'Updated'
                })
            }
        })
    }

    if(req.method?.toLowerCase() == 'delete'){
        if(req.cookies.token){
            const verify = jwt.verify(req.cookies.token, process.env.SECRET_KEY! ) as JwtPayload
            const Post = Database('posts');
            (await Post).findOne({username:verify.username, _id:new ObjectId(req.body.albumId)}).then(async(result)=>{
                if(result){
                    for(let file of result.files){
                        let desertRef = ref(storage, `uploads/${file.filename}`);
                        let status = await deleteObject(desertRef)
                        
                    }
                    
                    (await Post).deleteOne({username:verify.username, _id:new ObjectId(req.body.albumId)}).then((result)=>{
                        res.json({
                            code:200,
                            message:'Album deleted',
                            data : result
                        })
                    })


                }else{
                    res.json({
                        code:400,
                        message:'Album not found'
                    })
                }
            });
        }else{
            res.json({
                code:400,
                message:'Auth Failed'
            })
        }
    }

    if(req.method?.toLowerCase() == 'get'){
        if(req.cookies.token){
            const verify = jwt.verify(req.cookies.token, process.env.SECRET_KEY! ) as JwtPayload
            const Post = Database('posts');
            (await Post).aggregate([
                {$match:{username:verify.username}},
                {$sort:{_id:-1}}
            ]).toArray().then((result)=>{
                if(result.length>0){
                    res.json({
                        code:200,
                        message:"Post found",
                        data:result
                    })
                }else{
                    res.json({
                        code:400,
                        message:"You dont have any album yet",
                    })
                }
            })
        }
        
    }
}

