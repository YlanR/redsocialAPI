// Importar dependencias y modulos
const User = require("../models/User");
const bcrypt = require("bcrypt");
const mongoosePagination = require("mongoose-pagination");
const fs = require("fs");
const path = require("path");

// importar servicios
const jwt = require('../services/jwt');
const followService = require("../services/followService");
const Follow = require("../models/Follow");
const Publication = require("../models/Publication");
const { validate } = require("../helpers/validate");

// Acciones de prueba
const pruebaUser = (req, res) =>{
    return res.status(200).send({
        message: "Mensaje enviado desde: controller/user.js",
        usuario: req.user
    });
}

// Registro de usuarios
const register = (req, res) => {
    // Recoger datos de la peticion
    let params = req.body;
    // Comprobar que me llegan bien(+ validacion)
    if(!params.name || !params.email || !params.password || !params.nick){
        return res.status(400).json({
            status: "error",
            message: "Faltan datos por enviar",
        });
    }

    // Validacion avanzada
    try{
        validate(params);
    }catch(error){
        return res.status(400).json({
            status: "error",
            message: "Validacion no superada",
        });
    }

    // Control de usuarios duplicados
    User.find({ $or: [
        {email: params.email.toLowerCase()},
        {nick: params.nick.toLowerCase()}

    ]}).then(async (users) => {
        if (users && users.length >= 1) {
          return res.status(200).send({
            status: "success",
            message: "El usuario ya existe",
          });
        }

        // Cifrar la contraseña
        let hash = await bcrypt.hash(params.password, 10);
        params.password = hash;
        
        // Crear objeto usuario
        let user_to_save = new User(params);

        // Guardar usuario en la bbdd
        user_to_save.save().then((userStored) => {

              // Devolver resultados
              return res.status(200).json({
                status: "success",
                message: "Usuario registrado correctamente",
                user: userStored
            });

        }).catch((error) => {
            return res.status(500).send({ status: "error", message: "Error al guardar el usuario" });
        });

    });
}

const login = async(req, res) => {
    // Recoger parametros body
    let params = req.body;

    if(!params.email || !params.password){
        return res.status(400).send({
            status: "error",
            message: "Faltan datos por enviar"
        })
    }

    // Buscar en la bbdd si existe
    User.findOne({email: params.email})
        // .select({"password": 0})
        .then((user, error) => {
            if(error || !user) return res.status(404).send({status: "error", message: "No existe el usuario"});

            // Comprobar su contraseña
            let pwd = bcrypt.compareSync(params.password, user.password)

            if(!pwd){
                return res.status(400).send({
                    status: "error",
                    message: "No te has identificado correctamente"
                });
            }
            // Conseguir token
            const token = jwt.createToken(user);

            // Devolver datos del usuario

            return res.status(200).send({
                status: "success",
                message: "Te has identificado correctamente",
                user: {
                    id: user._id,
                    user: user.name,
                    nick: user.nick
                },
                token
            });
        });
}

const profile = async(req, res) => {
    // try {
    //     const id = req.params.id;

    //     const userProfile = await User.findById(id).select({ password: 0, role: 0 });

    //     const followInfo = await followService.followThisUser(req.user.id, id);

    //     return res.status(200).send({
    //         status: "success",
    //         user: userProfile,
    //         following: followInfo.following,
    //         follower: followInfo.followers
    //     });

    // } catch (error) {
    //     return res.status(404).send({
    //         status: "error",
    //         message: "El usuario no existe o hay un error"
    //     });
    // }

    // Recibir el parametro del id de usuario por la url
    const id = req.params.id;

    // Consulta para sacar los datos del usuario
    // const userProfile = await user.findById(id)
    User.findById(id).select({password: 0, role: 0})
        .then(async(userProfile) => {

        // Infor de seguimiento
        const followInfo = await followService.followThisUser(req.user.id, id);

        // Posteriormente devolver informacion de follows
        return res.status(200).send({
            status: "success",
            user: userProfile,
            following: followInfo.following,
            follower: followInfo.followers
        });
    }).catch((error) => {
        return res.status(404).send({
            status: "error",
            message: "El usuario no existe o hay un error"
        });
    })
}

const list = async(req, res) => {
    // Controlar en que pagina estamos
    let page = 1;
    if(req.params.page){
        page = req.params.page;
    }
    page = parseInt(page);

    // Consulta con mongoose paginate
    let itemsPerPage = 5;

    try{
        const followUserIds = await followService.followUserIds(req.user.id);
        
        // const itemsPerPage = 10;
        // const page = req.query.page || 1;
        const skip = (page - 1) * itemsPerPage;
        
        // Find publicaciones con in, ordenar, popular, paginar
        const [users, total] = await Promise.all([
          User.find()
            .select("-password -role -__v -email")
            .sort("_id")
            .skip(skip)
            .limit(itemsPerPage),
            User.countDocuments()

        ]);

        if(!users){
            return res.status(500).send({
                status: "error",
                message: "No hay usuarios disponibles"
            });
        }
        
        return res.status(200).send({
          status: "success",
          total : total,
          page,
          pages: Math.ceil(total/itemsPerPage),
          users,
          following: followUserIds.following,
          follow_me: followUserIds.followers
        });


    }catch(error){
        return res.status(500).send({
            status: "error",
            message: "No hay usuarios disponibles"
        });

    }

    // User.find().select("-password -email -role -__v").sort('_id').paginate(page, itemsPerPage, async(error, users, total) => {

    //     if(error || !users){ 
    //         return res.status(404).send({
    //             status: "error",
    //             message: "No hay usuarios disponibles",
    //             error
    //         });
    //     }

    //     // Sacar un array de ids de los usuarios que me siguen y los que sigo
    //     let followUserIds = await followService.followUserIds(req.user.id);


    //     // Devolver el resultado(Posteriormente info de follows)
    //     return res.status(200).send({
    //         status: "success",
    //         users,
    //         page,
    //         itemsPerPage,
    //         total,
    //         pages: Math.ceil(total/itemsPerPage),
    //         user_following: followUserIds.following,
    //         user_follow_me: followService.followers
    //     });
    // });
}

const update = (req, res) => {
    // Recoger info del usuario a actualizar
    let userIdentity = req.user;
    let userToUpdate = req.body

    // Eliminar campos sobrantes
    delete userToUpdate.iat;
    delete userToUpdate.exp;
    delete userToUpdate.role;
    delete userToUpdate.image;

    // Comprobar si el usuario ya existe
      
    User.find({
        $or: [
            {email: userToUpdate.email.toLowerCase()},
            {nick: userToUpdate.nick.toLowerCase()}
        ]
    }).then(async (users) => {

        let userIsset = false;
        users.forEach(user => {
            if(user && user._id != userIdentity.id) userIsset = true;
        });

        if (userIsset) {
            return res.status(200).send({
                status: "success",
                message: "El usuario ya existe",
            });
        }

        // Cifrar la contraseña
        if(userToUpdate.password){
            let hash = await bcrypt.hash(userToUpdate.password, 10);
            userToUpdate.password = hash;
        } else{
            delete userToUpdate.password;
        }

        // Buscar y actualizar
        try{
            let userUpdate = await User.findByIdAndUpdate({_id: userIdentity.id}, userToUpdate, {new:true});
        
            if(!userUpdate){
                return res.status(400).send({ status: "error", message: "Error al actualizar el usuario" });
            }

             // Devolver respuesta
            return res.status(200).send({
                status: "success",
                message: "Metodo de actualizar usuario",
                user: userUpdate
            });

        }catch(error){
            return res.status(500).send({
                status: "error",
                message: "Error al actualizar",
            });
        }

    }).catch((error) => {
        return res.status(500).send({ status: "error", message: "Error al guardar el usuario" });
    });
}

const upload = (req, res) => {

    // Recoger el fichero de imagen y comprobar que existe
    if(!req.file){
        return res.status(404).send({
            status: "error",
            message: "La peticion no incluye la imagen",
        });
    }

    // Conseguir el nombre del archivo
    let image = req.file.originalname;

    // Sacar la extension del archivo
    const imageSplit = image.split("\.");
    const extension = imageSplit[1];

    // Comprobar extension
    if(extension != "png" && extension != "jpg" && extension != "jpeg" && extension != "gif"){

        // Borrar archivo subibo
        const filePath = req.file.path;
        const fileDeleted = fs.unlinkSync(filePath);

        // Devolver respuesta negativa
        return res.status(400).send({
            status: "error",
            message: "Extension del fichero invalida",
        });
    }

    // Si si es correcta, guardar imagen en bbd
    User.findOneAndUpdate({_id: req.user.id}, {image: req.file.filename}, {new:true}).then((error, userUpdate) => {
        // Devolver respuesta
        return res.status(200).send({
            status: "success",
            user: userUpdate,
            file: req.file,
        });
    }).catch((error) => {
        if(error || !userUpdate){
            return res.status(500).send({
                status: "error",
                message: "Error en la subida del avatar",
            });
        }
    })
}

const avatar = (req, res) => {
    // Sacar el parametro de la url
    const file = req.params.file;

    // Montar el path real de la imagen
    const filePath = "./uploads/avatars/"+file;

    // Comprobar que existe
    fs.stat(filePath, (error, exists) => {
        if(!exists){
            return res.status(404).send({
                status:"error", 
                message: "No existe la imagen"
            });  
        } 

        // Devolver un file

        return res.sendFile(path.resolve(filePath));
    });
}

const counter = async(req, res) => {
    let userId = req.user.id;

    if(req.params.id) {
        userId = req.params.id;
    }

    try{
        const following = await Follow.countDocuments({"user": userId});

        const followed = await Follow.countDocuments({"followed": userId});

        const publications = await Publication.countDocuments({"user": userId});

        return res.status(200).send({
            userId,
            following: following,
            followed: followed,
            publications: publications
        });

    }catch(error){
        return res.status(500).send({
            status: "error",
            message: "Error en la subida del avatar",
        });
    }
}

// Exportar acciones
module.exports = {
    pruebaUser,
    register,
    login,
    profile,
    list,
    update,
    upload,
    avatar,
    counter
}