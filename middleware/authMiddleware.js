const isAuth= (req, res, next)=>{
    // console.log(req.session);
    if(req.session.isAuth===true){
        next()
    }
    else return res.status(401).send("Session expired, please login again")  // 401 => unauthorized
}

module.exports=isAuth