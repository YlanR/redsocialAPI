const validator = require("validator");

const validate = (params) => {
    let name = !validator.isEmpty(params.name) &&
                validator.isLength(params.name, {min: 3, max: undefined}) &&
                validator.isAlpha(params.name, "es-VE");
    
    let surname = !validator.isEmpty(params.surname) &&
                   validator.isLength(params.surnname, {min: 3, max: undefined}) &&
                   validator.isAlpha(params.surname, "es-VE");
    
    let nick = !validator.isEmpty(params.nick) &&
                   validator.isLength(params.nick, {min: 2, max: undefined});
    
    let email = !validator.isEmpty(params.email) &&
                   validator.isEmail(params.email);
    
    let password = !validator.isEmpty(params.password);
    
    if(params.bio){
        let bio =      validator.isLength(params.name, { min: undefined, max: 255 });
    
        if(!name || !surname || !nick || !email || !password || !bio) {
            throw new Error("No se ha superado la validacion");
        } else{
            console.log("validacion superada");
        }
    }

    if(!name || !surname || !nick || !email || !password) {
        throw new Error("No se ha superado la validacion");
    } else{
        console.log("validacion superada");
    }
}

module.exports = validate