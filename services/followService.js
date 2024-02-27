const Follow = require("../models/Follow");

const followUserIds = async(identityuserId) => {

    try{
        // Sacar infor seguimiento
        let following = await Follow.find({"user": identityuserId})
            .select({"followed":1, "_id":0})
            .exec();

        let followers = await Follow.find({"followed": identityuserId})
            .select({"user":1, "_id":0})
            .exec();
        
            // PRocesar array de identificadores
            let followingClean = [];

            following.forEach(follow => {
                followingClean.push(follow.followed);
            });

            let followersClean = [];

            followers.forEach(follow => {
                followersClean.push(follow.user);
            });

        return {
            following: followingClean,
            followers: followersClean 
        }

    }catch(error){
        return {}
    }
}

const followThisUser = async(identityUserId, profileUserId) => {
    // Sacar infor seguimiento
    let following = await Follow.findOne({"user": identityUserId, "followed":profileUserId})
            .select({"followed":1, "_id":0})
            .exec();

    let followers = await Follow.findOne({"user":profileUserId, "followed": identityUserId});

    return {
        following,
        followers
    }
}

module.exports = {
    followUserIds,
    followThisUser
}