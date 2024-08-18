const mongoose= require('mongoose')
const Schema= mongoose.Schema

const todoSchema= new Schema({
    todo: {type: String, required: true},
    username: {type: String, required: true}
},{
    timestamps: true // this way mongodb will automatically take care of the creation time and updation time of a todo schema. We
                    // explicitly dont have to do anything
})

module.exports= mongoose.model("todo", todoSchema)