import mongoose, {model, Schema} from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function connectMongo(){
    
    const mongoUrl = process.env.MONGO_URL

    if(!mongoUrl){
        throw new Error("Mongo url not defined");
    }
    
    const isConnectionActive = await mongoose.connect(mongoUrl)
    if(isConnectionActive){console.log("connected db")}
}
connectMongo();
export default mongoose

const UserSchema = new Schema({
    username: {type: String, unique: true},
    password: String
}) 

export const UserModel = model("User", UserSchema);

const ContentSchema = new Schema({
    title: String,
    link: String,
    tags: [{type: mongoose.Types.ObjectId, ref: 'Tag'}],
    type: String,
    userId: {type: mongoose.Types.ObjectId, ref: 'User', required: true },
})

const LinkSchema = new Schema({
    hash: String,
    userId: {type: mongoose.Types.ObjectId, ref: 'User', required: true, unique: true },
})

export const LinkModel = model("Links", LinkSchema);
export const ContentModel = model("Content", ContentSchema);