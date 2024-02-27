// Importar dependencias
const conexion = require("./database/conexion");
const express = require("express");
const cors = require("cors");

// Mensaje de bienvenida
console.log("API Node para red social arrancada");

// Conexion a bbdd
conexion();

// Crear servidor node
const app = express();
const puerto = 3900;

// Configurar cors
    //Usamos un middleware, lo que se ejecuta antes de los endpoint del api
app.use(cors());

// Convertir los datos del body a obj js
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// cargar conf rutas
const UserRutes = require("./rutes/userRute");
const PublicationRutes = require("./rutes/publicationRute");
const FollowRutes = require("./rutes/followRute");

app.use("/api/user", UserRutes);
app.use("/api/publication", PublicationRutes);
app.use("/api/follow", FollowRutes);

    //ruta de prueba
app.get("/ruta-prueba", (req, res) => {
    return res.status(200).json(
        {
            "id":1,
            "nombre": "Ylan",
            "web": "ilanrizo.com"
        }
    )
})

// Poner servidor a escuchar peticiones http
app.listen(puerto, () => {
    console.log("Servidor de node corriendo en el puerto: "+puerto);
});