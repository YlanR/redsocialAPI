const Publication = require("../models/Publication");

// Importar modulos
const fs = require("fs");
const path = require("path");

// Importar servicios
const followService = require("../services/followService");

// Acciones de prueba
const pruebaPublication = (req, res) =>{
    return res.status(200).send({
        message: "Mensaje enviado desde: controller/publication.js"
    });
}

// Guardar publicacion
const save = (req, res) => {
    // Recoger datos del body
    const params = req.body;

    // Si no me llega, dar una respuesta negativa
    if(!params.text) return res.status(400).send({status:"error", message:"Debes enviar el texto de la publicacion"});

    // Crear y rellenar el objeto del modelo
    let newPublication = new Publication(params);
    newPublication.user = req.user.id;

    // Guardar objeto en bbdd
    newPublication.save().then((publicationStorage) => {
        
        // Devolver respuesta
        return res.status(200).send({
            status: "success",
            message:"Publicacion guardada",
            publicationStorage
        });
    }).catch((error) => {if(error || !publicationStorage) return res.status(400).send({status:"error", message:"No se ha guardado la publicacion"});});

}

// Sacar una publicacion
const detail = (req, res) => {
    // Sacar id de publicacion de la url
    const publicationId = req.params.id;

    // Find con la condicion del id
    Publication.findById(publicationId).then((publicationStorage) => {
        // Devolver respuesta
        return res.status(200).send({
            status: "success",
            message:"Mostrar publicacion",
            publication: publicationStorage
        });

    }).catch((error) => {
        if(error) res.status(404).send({status:"error", message:"No existe la publicacion"})
    })

   
}

// Eliminar publicaciones
const remove = (req, res) => {
    // SAcar id de la publicacion a eliminar
    const publicationId = req.params.id;

    // Find y luego remove
    Publication.find({"user": req.user.id, "_id": publicationId}).findOneAndDelete()
    .then(() => {
        // Devolver respuesta
        return res.status(200).send({
            status: "success",
            message:"Eliminar publicacion",
            publication: publicationId
        })
    }).catch((error)=>{
        return res.status(500).send({
            status: "error",
            message:"No se ha eliminado la publicacion",
        })
    })
     
}

// Listar publicaciones de un usuario
const user = async(req, res) => {
    // Sacar el id de usuario
    const userId = req.params.id

    // Controlar la pagina
    let page = 1
    
    if(req.params.page) page = req.params.page
    
    const itemsPerPage = 5;



    // Sacar una array de identificadores de usuarios que yo sigo como usuario logueado
    try{
        const myFollow = await followService.followUserIds(req.user.id);
        
        // const itemsPerPage = 10;
        // const page = req.query.page || 1;
        const skip = (page - 1) * itemsPerPage;
        
        // Find publicaciones con in, ordenar, popular, paginar
        const [publications, total] = await Promise.all([
          Publication.find({"user": userId})
            .populate("user", "-password -role -__v -email")
            .sort("-create_at")
            .skip(skip)
            .limit(itemsPerPage),
          Publication.countDocuments(),
          
        ]);

        if(!publications){
            return res.status(500).send({
                status: "error",
                message: "No se hay publicaciones para mostrar"
            });
        }
        
        return res.status(200).send({
          status: "success",
          message: "Publicaciones del perfil de un usuario",
          total,
          page,
          pages: Math.ceil(total/itemsPerPage),
          publications
        });


    }catch(error){
        return res.status(500).send({
            status: "error",
            message: "No se han listado las publicaciones del feed"
        });
    }


    // Find, populate, ordenar, paginar
    // Publication.find({"user": userId})
    // .sort("-create_at")
    // .populate('user', '-password -__v -role -email')
    // .paginate(page, itemsPerPage).then((publications, total) => {
    //     return res.status(200).send({
    //         status: "success",
    //         message:"Publicaciones del perfil de un usuario",
    //         page,
    //         total,
    //         pages: Math.ceil(total/itemsPerPage),
    //         publications
    //     })
    // }).catch((error) => {
    //     if(error){
    //         return res.status(404).send({
    //             status: "error",
    //             message:"No hay publicaciones para mostrar",
    //         })
    //     }
    // })

}


// Subir ficheros
const upload = (req, res) => {
    // Sacar publicationId
    const publicationId = req.params.id

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
    Publication.findOneAndUpdate({"user": req.user.id, "_id":publicationId}, {file: req.file.filename}, {new:true}).then((error, publicationUpdate) => {
        // Devolver respuesta
        return res.status(200).send({
            status: "success",
            publication: publicationUpdate,
            file: req.file,
        });
    }).catch((error) => {
        if(error){
            return res.status(500).send({
                status: "error",
                message: "Error en la subida de la imagen",
            });
        }
    })
}

// Devolver archivos multimedia imagenes
const media = (req, res) => {
    // Sacar el parametro de la url
    const file = req.params.file;

    // Montar el path real de la imagen
    const filePath = "./uploads/publications/"+file;

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

// Listar todas las publicaciones (FEED)
const feed = async(req, res) => {
    // Sacar la pagina actual
    let page = 1;

    if(req.params.page){
        page = req.params.page;
    }

    // Establecer numero de elementos por pagina
    let itemsPerPage = 5;

    // Sacar una array de identificadores de usuarios que yo sigo como usuario logueado
    try{
        const myFollow = await followService.followUserIds(req.user.id);
        
        // const itemsPerPage = 10;
        // const page = req.query.page || 1;
        const skip = (page - 1) * itemsPerPage;
        
        // Find publicaciones con in, ordenar, popular, paginar
        const [publications, total] = await Promise.all([
          Publication.find({ user: myFollow.following })
            .populate("user", "-password -role -__v -email")
            .sort("-create_at")
            .skip(skip)
            .limit(itemsPerPage),
          Publication.countDocuments(),

        ]);

        if(!publications){
            return res.status(500).send({
                status: "error",
                message: "No se hay publicaciones para mostrar"
            });
        }
        
        return res.status(200).send({
          status: "success",
          message: "Feed de publicaciones",
          total,
          page,
          pages: Math.ceil(total/itemsPerPage),
          publications
        });


    }catch(error){
        return res.status(500).send({
            status: "error",
            message: "No se han listado las publicaciones del feed"
        });

    }
    

   
}


// Exportar acciones
module.exports = {
    pruebaPublication,
    save,
    detail,
    remove,
    user,
    upload,
    media,
    feed
}