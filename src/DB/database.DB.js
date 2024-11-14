const mongoose = require('mongoose')

const connectDB = async()=>{
    try {
        
        const connectionFordb = await mongoose.connect(`${process.env.MONGO_URI}`)
         const response=await connectionFordb.connection.host;
    // console.log(response);
        console.log(`MONGO DB RUN ON !! ${response}`);
        
        
    } catch (error) {
        console.log(error);
        process.exit(1)
    }
}

module.exports = connectDB