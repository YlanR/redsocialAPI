const Follow = require("../models/Follow");
const User = require("../models/User");

// Importar servicio
const followService = require("../services/followService");

// Importar dependencias
const mongoosePaginate = require("mongoose-pagination");

// Acciones de prueba
const pruebaFollow = (req, res) =>{
    return res.status(200).send({
        message: "Mensaje enviado desde: controller/follow.js"
    });
}

// Accion de Guardar un follow (accion de seguir)
const save = (req, res) => {
    // Conseguir datos por body
    const params = req.body;

    // Sacar id del usuario identificado
    const identity = req.user;

    // Crear objeto con modelo follow
    let userToFollow = new Follow({
        user: identity.id,
        followed: params.followed
    });

    // Guardar Objeto en bbdd
    userToFollow.save().then((followStorage) => {
      
        return res.status(200).send({
            status: "success",
            identity: req.user,
            follow: followStorage
        });
    }).catch((error) => {
        if(error){
            return res.status(500).send({
                status:"error", 
                message: "No se ha podido seguir al usuario"
            });  
        }

    })
}

// Accion de Borrar un follow (accion de dejar de seguir)
const unfollow = async(req, res) => {
    // recoger el id del usuario identificado
    const userId = req.user.id;
    
    // recoger el id del usuario a dejar de seguir
    const followedId = req.params.id;

    // buscar en la base de datos la coincidencia y eliminarla
    await Follow.deleteOne({

        "user": userId,
        "followed": followedId

    }).then(()=> {

        return res.status(200).send({
            status: "success",
            message: "Follow eliminado correctamente",
        });

    }).catch((error) => {

        return res.status(500).send({
            status: "error",
            message: "No se pudo dejar de seguir al usuario",
        });
    })
}

// Accion listado de usuarios que cualquier usuario esta siguiendo (Siguiendo)
const following = async(req, res) => {
    // Sacar el id del usuario identificado
    let userId = req.user.id;

    // Comprobar si me llega el id por parametro en url
    if(req.params.id) userId = req.params.id;

    // Comprobar si me llega la pagina, si no la pagina
    let page = 1;

    if(req.params.page) page = req.params.page
    
    // Usuarios por pagina quiero mostrar
    const itemsPerPage = 5;


    try{
        const followUserIds = await followService.followUserIds(req.user.id);
        
        // const itemsPerPage = 10;
        // const page = req.query.page || 1;
        const skip = (page - 1) * itemsPerPage;
        
        // Find publicaciones con in, ordenar, popular, paginar

    const [follows, total] = await Promise.all([
        Follow.find({ user: userId })
          .populate("user followed", "-password -role -__v -email")
          .sort("-create_at")
          .skip(skip)
          .limit(itemsPerPage),
          Follow.countDocuments()

      ]);

      if(!follows){
          return res.status(500).send({
              status: "error",
              message: "No hay usuarios disponibles"
          });
      }
      
      return res.status(200).send({
        status: "success",
        total,
        page,
        pages: Math.ceil(total/itemsPerPage),
        follows,
        following: followUserIds.following,
        follow_me: followUserIds.followers
      });


  }catch(error){
      return res.status(500).send({
          status: "error",
          message: "No hay usuarios disponibles"
      });

  }
    // Find a follow, popular datos de los usuarios y paginar con mongoose paginate
    
    // Follow.find({user: userId})
    // .populate("user followed", "-password -role -__v -email")
    // .paginate(page, itemPerPage).then(async(error, follows, total) => {

    //     // Sacar un array de ids de los usuarios que me siguen y los que sigo
    //     let followUserIds = await followService.followUserIds(req.user.id);

    //     return res.status(200).send({
    //         status: "success",
    //         message: "Listado de usuarios que estoy siguiendo",
    //         follows,
    //         total,
    //         pages: Math.ceil(total/itemPerPage),
    //         user_following: followUserIds.following,
    //         user_follow_me: followService.followers
    //     })
    // })
    

}

// Accion listado de usuarios que siguen a cualquier otro usaurio (Soy seguido)
const followers = async(req, res) => {
    // Sacar el id del usuario identificado
    let userId = req.user.id;

    // Comprobar si me llega el id por parametro en url
    if(req.params.id) userId = req.params.id;

    // Comprobar si me llega la pagina, si no la pagina
    let page = 1;

    if(req.params.page) page = req.params.page

    // Usuarios por pagina quiero mostrar
    const itemsPerPage = 5;



    try{
        const followUserIds = await followService.followUserIds(req.user.id);
        
        // const itemsPerPage = 10;
        // const page = req.query.page || 1;
        const skip = (page - 1) * itemsPerPage;
        
        // Find publicaciones con in, ordenar, popular, paginar

        const [follows, total] = await Promise.all([
            Follow.find({followed: userId})
            .populate("user followed", "-password -role -__v -email")
            .sort("-create_at")
            .skip(skip)
            .limit(itemsPerPage),
            Follow.countDocuments()

        ]);

        if(!follows){
            return res.status(500).send({
                status: "error",
                message: "No hay usuarios disponibles"
            });
        }
        
        return res.status(200).send({
            status: "success",
            total,
            page,
            pages: Math.ceil(total/itemsPerPage),
            follows,
            following: followUserIds.following,
            follow_me: followUserIds.followers
        });


    }catch(error){
        return res.status(500).send({
            status: "error",
            message: "No hay usuarios disponibles"
        });

    }



    // Find a follow, popular datos de los usuarios y paginar con mongoose paginate
    // Follow.find({followed: userId})
    // .populate("user", "-password -role -__v -email")
    // .paginate(page, itemPerPage, async(error, follows, total) => {

    //     let followUserIds = await followService.followUserIds(req.user.id);

    //     return res.status(200).send({
    //         status: "success",
    //         message: "Listado de usuarios que me siguen",
    //         follows,
    //         total,
    //         pages: Math.ceil(total/itemPerPage),
    //         user_following: followUserIds.following,
    //         user_follow_me: followService.followers
    //     })
    // })

}

// Exportar acciones
module.exports = {
    pruebaFollow,
    save,
    unfollow,
    following,
    followers
}