const express = require('express');
const app=express();
const jwt=require('jsonwebtoken');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port =process.env.PORT || 5000;

app.use(express.json())
app.use(cors())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mtjlx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const userCollection=client.db('restaurantDb').collection('users');
    const menuCollection=client.db('restaurantDb').collection('menu');
    const CartCollection=client.db('restaurantDb').collection('cart');
    // // jwt api
 
    app.post('/jwt',async(req,res)=>{
      const user=req.body;
      const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:'1h'
      });
      res.send({token})
    })
    // verify token
    const verifyToken=async(req,res,next)=>{
      // console.log(req.headers.authorization)
      if(!req.headers.authorization){
        return res.status(401).send({message:"unAuthorized access"})
      }
      const token=req.headers.authorization.split(' ')[1];
      // console.log("token from user: ",token)
      jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
          if(err){
            return res.status(401).send({message:"UnAuthorized access"})
          }
          req.decoded=decoded;
          next()
      })
   
    }
    // verify admin after verify token
    const verifyAdmin=async(req,res,next)=>{
       const email=req.decoded.email;
       const query={email:email};
       const user= await userCollection.findOne(query)
       const isAdmin=user?.role=='admin';
       
       if(!isAdmin){
         return  res.status(403).send({message:"forbidden request"})
       }
       next()
    }
    // //  user api
    app.get('/users',verifyToken,verifyAdmin,async(req,res)=>{
      
      const result= await userCollection.find().toArray();
      res.send(result)
    })
    app.post('/users',async(req,res)=>{
      const user=req.body;
      const query={email:user.email};
      const existUser= await userCollection.findOne(query)
      if(existUser){
        return res.send({message:'user already exist', insertedId:null})
      }
      const result =await userCollection.insertOne(user);
      res.send(result)
   
    })
   app.get('/users/admin/:email',verifyToken,async(req,res)=>{
    const email=req.params.email;
    if(email !== req.decoded.email){
      return res.status(403).send({message:"forbidden access"})
    }
    const query={email:email}
    const user=await userCollection.findOne(query);
    let admin=false;
    if(user){
      admin=user?.role=="admin";
    }
    res.send({admin})
   })
   app.delete('/users/:id',async(req,res)=>{
    const id=req.params.id;
    const query={_id: new ObjectId(id)}
    const result=await userCollection.deleteOne(query);
    res.send(result)
   })

   app.patch('/users/admin/:id', async(req,res)=>{
    const id=req.params.id;
    const query={_id: new ObjectId(id)}
    const updateDocument={
      $set:{
        role:'admin'
      }
    }
    const result = await userCollection.updateOne(query,updateDocument);
     res.send(result)
   })

    // menu api
    app.get('/menu',async(req,res)=>{
       const menu=  menuCollection.find();
       const result= await menu.toArray();
       res.send(result)
    })
    app.get('/carts',async(req,res)=>{
      const email=req.query.email;
      const query={email:email}
      const  result=await CartCollection.find(query).toArray();
      res.send(result)
    }
  )
    app.post('/carts', async(req,res)=>{
      const items=req.body;
      const result=await CartCollection.insertOne(items);
      res.send(result)
    })
    app.delete('/carts/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      const result = await CartCollection.deleteOne(query);
      res.send(result)
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/',(req,res)=>{
    res.send('welcome to the FoodPilot restuarant Server')
})

app.listen(port,()=>{
    console.log('listen from the port: ',port)
})

