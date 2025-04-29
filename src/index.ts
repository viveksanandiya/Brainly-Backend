import express from "express";
import { random } from "./utils";
import jwt from "jsonwebtoken";
import { ContentModel, LinkModel, UserModel } from "./db";
import { JWT_PASSWORD } from "./config";
import { userMiddleware } from "./middleware";
import { z } from "zod";
import * as argon2 from "argon2";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/api/v1/signup", async (req, res) => {
    // TODO: zod validation , hash the password
    const zodSchema = z.object({
        username: z.string().min(2).max(50),
        password: z.string().min(2).max(50)
    });
    
    const parsedData = zodSchema.safeParse(req.body);

    if (!parsedData.success) {
        res.json({
            message: "incorrect format of data",
            error: parsedData.error
        })
        return
    }

    try {
        const username = req.body.username;
        const password = req.body.password;

        const userExist = await UserModel.findOne({
            username
        }) 

        if(userExist){
            const dbPassword:any = userExist.password;

            if(await argon2.verify(dbPassword,password)){
                res.json({
                    message:"this User exist"
                })
            }
            else{
                res.json({
                    message:"User name exist change you name"
                })
            }
            
        }

        const hashedPassword = await argon2.hash(password);

        await UserModel.create({
            username: username,
            password: hashedPassword
        }) 

        res.json({
            message: "User signed up"
        })
        
    } catch(e) {
        res.status(411).json({
            message: "User already exists"
        })
    }
})

app.post("/api/v1/signin", async (req, res) => {
    const zodSchema = z.object({
        username: z.string().min(2).max(50),
        password: z.string().min(2).max(50)
    });
    
    const parsedData = zodSchema.safeParse(req.body);

    if (!parsedData.success) {
        res.json({
            message: "incorrect format of data",
            error: parsedData.error
        })
        return
    }
    
    try{
    const username = req.body.username;
    const password = req.body.password;

    const existingUser = await UserModel.findOne({
        username
    })

    if (existingUser) {
        const dbPassword:any = existingUser.password;

        if(await argon2.verify(dbPassword, password)){
            const token = jwt.sign({
                id: existingUser._id
            }, JWT_PASSWORD)

            res.json({
                token
            })
        }
    } else {
        res.status(403).json({
            message: "Incorrrect credentials"
        })
    }
} catch(e) {
    res.status(411).json({
        message: "try catch error"
    })
}
}) 
  
app.post("/api/v1/content", userMiddleware, async (req, res) => {

    const zodSchema = z.object({
        link: z.string().min(1).max(50).url(),
        type: z.string().min(1).max(50),
        title: z.string().min(1).max(50)
    });
    
    const parsedData = zodSchema.safeParse(req.body);

    if (!parsedData.success) {
        res.json({
            message: "incorrect format of data",
            error: parsedData.error
        })
        return
    }

    try{
    //link:- link of twitter, yt, etc
    //type:- name of linked app like yt, twitter 
    const link = req.body.link;
    const type = req.body.type;
    await ContentModel.create({
        link,
        type,
        title: req.body.title,
        userId: req.userId,
        tags: []
    })

    res.json({
        message: "Content added"
    })
    } catch(e) {
    res.status(411).json({
        message: "Utry catch error"
    })
}
})

app.get("/api/v1/content", userMiddleware, async (req, res) => {    
    try{
    // @ts-ignore
    const userId = req.userId;
    const content = await ContentModel.find({
        userId: userId
    }).populate("userId", "username")
    res.json({
        content
    })
} catch(e) {
    res.status(411).json({
        message: "try catch error"
    })
}
})

app.delete("/api/v1/content", userMiddleware, async (req, res) => {
    
    try{
    const contentId = req.body.contentId;

    await ContentModel.deleteMany({ 
        contentId,
        userId: req.userId
    })

    res.json({
        message: "Deleted"
    })
} catch(e) {
    res.status(411).json({
        message: "try catch error"
    })
}
})

//it allows or stops sharing user content
app.post("/api/v1/brain/share", userMiddleware, async (req, res) => {

    try{
    //share: true/false
    const share = req.body.share;
    //or --- const { share } = req.body
    if (share) {
            const existingLink = await LinkModel.findOne({
                userId: req.userId
            });

            if (existingLink) {
                res.json({
                    hash: existingLink.hash
                })
                return;
            }
            const hash = random(10);
            await LinkModel.create({
                userId: req.userId,
                hash: hash
            })

            res.json({
                hash:hash
            })
    } else {
        await LinkModel.deleteOne({
            userId: req.userId
        });

        res.json({
            message: "Removed link"
        })
    }
} catch(e) {
    res.status(411).json({
        message: "try catch error"
    })
}
})

app.get("/api/v1/brain/:shareLink", async (req, res) => {
    
    try{
    const hash = req.params.shareLink;

    const link = await LinkModel.findOne({
        hash
    });

    if (!link) {
        res.status(411).json({
            message: "Sorry incorrect input"
        })
        return;
    }
    // userId
    const content = await ContentModel.find({
        userId: link.userId
    })

    // console.log(link);
    const user = await UserModel.findOne({
        _id: link.userId
    })

    if (!user) {
        res.status(411).json({
            message: "user not found, error should ideally not happen"
        })
        return;
    }

    res.json({
        username: user.username,
        content: content
    })
} catch(e) {
    res.status(411).json({
        message: "try catch error"
    })
}

})

app.listen(3000);