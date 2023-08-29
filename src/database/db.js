const { MongoClient } = require('mongodb');
const uri =
  'mongodb+srv://tiktok:iD32OHUBIM8N2dOw@cluster0.jnmegyz.mongodb.net/?retryWrites=true&w=majority';

let client;

const getDB = () => {
  if (!client) {
    console.log('Creating a new client!');
    client = new MongoClient(uri);
  } else {
    console.log('Reusing the old client');
  }

  const database = client.db('test');
};

module.exports = getDB;