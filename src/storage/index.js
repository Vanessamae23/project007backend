import {
    getDownloadURL,
    uploadBytesResumable,
    ref
  } from "firebase/storage";
import { storage } from "../database/db.js";
import fs from 'fs'; // Import the Node.js fs module


export const saveMediaToStorage = (mediaPath, storagePath) => new Promise(async (resolve, reject) => {
    const absoluteMediaPath = mediaPath.replace("file:///", "/");
    console.log(absoluteMediaPath);

    const fileRef = ref(storage, storagePath);

    // Read the local file using the fs module
    fs.readFile(absoluteMediaPath, async (err, data) => {
      if (err) {
        console.error('Error reading file:', err);
        reject('Error reading file.');
        return;
      }
  
      // Upload the file data to Firebase Storage
      const uploadTask = uploadBytesResumable(fileRef, data);
  
      uploadTask.on('state_changed', (snapshot) => {
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
        switch (snapshot.state) {
          case 'paused':
            console.log('Upload is paused');
            break;
          case 'running':
            console.log('Upload is running');
            break;
        }
      },
      (error) => {
        // Handle the upload error
        console.error('Error uploading image:', error);
        reject('Error uploading image.');
      },
      () => {
        // Upload completed successfully, now we can get the download URL
        getDownloadURL(fileRef)
          .then((downloadURL) => {
            console.log('File available at', downloadURL);
            resolve(downloadURL);
          })
          .catch((error) => {
            console.error('Error getting download URL:', error);
            reject('Error getting download URL.');
          });
      });
    });
  });