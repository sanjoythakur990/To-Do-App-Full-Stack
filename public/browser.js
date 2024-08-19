let skip=0

window.onload= generateTodos

function generateTodos(){
    axios.get(`/read-item?skip=${skip}`).then((res)=>{
        console.log(res);
        if(res.data.status!== 200){
            alert(res.data.message)
        }
        const todos= res.data.data

        skip+=todos.length

        console.log(document.getElementById("item_list"));
        document.getElementById("item_list").insertAdjacentHTML("beforeend", todos.map((item)=>{
            return `<div>
            <li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
            <span class="item-text"> ${item.todo}</span>
            <div>
            <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
            <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
            </div>
            </li>
            <br />
            </div>`
            ;
        }).join("")
        )
    }).catch((err)=> console.log(err))
}

document.addEventListener("click", (e)=>{
    //edit
    if(e.target.classList.contains("edit-me")){
        const newData= prompt("Enter the new todo")
        const todoId= e.target.getAttribute("data-id")

        axios.post("update-item", {newData, todoId})
        .then((res)=> {
            if(res.data.status!==200) {
                alert(res.data.message)
                return
            }
            e.target.parentElement.parentElement.querySelector(".item-text").innerText= newData
            return;
        })
        .catch(err=> console.log(err))
    }
    //delete
    else if(e.target.classList.contains("delete-me")){
        const todoId= e.target.getAttribute("data-id")

    axios.post("/delete-item", {todoId})
    .then((res)=> {
        console.log(res)
        if(res.data.status!==200) {
            alert(res.data.message)
            return
        }
        e.target.parentElement.parentElement.parentElement.remove()
    })
    .catch((err)=> console.log(err))
    }
    //create
    else if(e.target.classList.contains("add_item")){
        const todo= document.getElementById("create_field").value;
        axios.post("create-item", {todo})
        .then((res)=>{
            console.log(res)
            const todo= res.data.data.todo
            const todoId= res.data.data._id
            document.getElementById("create_field").value= ""
            document.getElementById("item_list").innerHTML+=
            `<div>
            <li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
            <span class="item-text"> ${todo}</span>
            <div>
            <button data-id="${todoId}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
            <button data-id="${todoId}" class="delete-me btn btn-danger btn-sm">Delete</button>
            </div>
            </li>
            <br />
            </div>`
        })
        .catch((err)=> {
            if(err.response.status!==500){
                alert(err.response.data)
                return
            } 
        })
    }
    //logout
    else if(e.target.classList.contains("logout")){
        // console.log("logout clicked");
        axios.post("logout")
        .then((response)=>{
            console.log(response);
            if (response.status === 200) {
                // Redirect to the login page
                window.location.href = '/login';
            }
        })
        .catch((err)=> console.log(err))
    }
    // show more
    else if(e.target.classList.contains("show-more")){
        generateTodos()    // pagination done
    }
})

