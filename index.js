require('dotenv').config()
const express = require('express')
const connectDB = require('./src/DB/database')
const userrouter = require('./src/routes/Login.routes')

const cookieParser = require('cookie-parser')

const cors = require('cors') 
const { subsciptionrouter } = require('./src/routes/subscription.routes')



const app = express()

app.use(cors({
    origin: ['http://localhost:3000', 'https://subscription-6d1n.onrender.com']
}));

const port = process.env.PORT || 2132; 

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use('/',userrouter)
app.use('/',subsciptionrouter)

app.get('/',(req,res)=>{
    res.send('Hello World')
})

connectDB()
.then(()=>{
    app.listen(port, () => {
        console.log(`Server is running on port http://localhost:${port}/`)
    })
})
.catch((err)=>{
    console.log(err);
})