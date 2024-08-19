const accessModel = require("../models/accessModel");

const rateLimiting= async (req, res, next)=>{
    console.log(req.session.id);   // syntax for session id from request
    const sid= req.session.id
    try {
        const accessEntry= await accessModel.findOne({sessionId: sid})
        console.log(accessEntry);

        // the first req, when accessEntry is null
        if(!accessEntry){
            const accessObbj= new accessModel({sessionId: sid, time: Date.now()})
            await accessObbj.save() 
            next()
            return
        }

        console.log((Date.now() - accessEntry.time)/1000);    // converting milliseconds into second
        const diff= (Date.now() - accessEntry.time)/1000

        if(diff < 2){      // 2 req/sec
            return res.status(400).json("Too many requests, please wait for some time")
        }

        // update the time of the accessEntry
        await accessModel.findOneAndUpdate({sessionId: sid}, {time: Date.now()})
        next()
    } catch (error) {
        return res.status(500).send(error)
    }
}

module.exports= rateLimiting



// Date.now() gives us a milliseconds from 1970 to right now
// 1970------------t0   
// 1970------------------t1
// t1 will be greater than t0