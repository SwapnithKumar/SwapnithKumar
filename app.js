const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

var parse = require("date-fns/parse");
var format = require("date-fns/format");
var isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const hasStatus = (query) => {
  return query.status !== undefined;
};

const hasPriority = (query) => {
  return query.priority !== undefined;
};

const hasStatusAndPriority = (query) => {
  return query.status !== undefined && query.priority !== undefined;
};

const hasSearchQuery = (query) => {
  return query.search_q !== undefined;
};

const hasCategoryAndStatus = (query) => {
  return query.category !== undefined && query.status !== undefined;
};

const hasCategory = (query) => {
  return query.category !== undefined;
};

const hasCategoryAndPriority = (query) => {
  return query.category !== undefined && query.priority !== undefined;
};

const hasTodo = (query) => {
  return query.todo !== undefined;
};

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

const checkRequestQuery = async (request, response, next) => {
  const validStatus = ["TO DO", "IN PROGRESS", "DONE"];
  const validPriority = ["HIGH", "MEDIUM", "LOW"];
  const validCategory = ["WORK", "HOME", "LEARNING"];
  const { todo, priority, status, category, dueDate, search_q } = request.query;
  const { todoId } = request.params;
  if (status !== undefined) {
    if (validStatus.includes(status) === true) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }
  if (priority !== undefined) {
    if (validPriority.includes(priority) === true) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }

  if (category !== undefined) {
    if (validCategory.includes(category) === true) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }

  if (dueDate !== undefined) {
    const myDate = new Date(dueDate);
    const formatedDate = format(myDate, "yyyy-MM-dd");
    console.log(formatedDate);
    const result = toDate(new Date(formatedDate));
    const isValidDate = isValid(result);
    if (isValidDate === true) {
      request.dueDate = formatedDate;
    } else {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }

  request.todoId = todoId;
  request.search_q = search_q;

  next();
};

const checkRequestBody = async (request, response, next) => {
  const validStatus = ["TO DO", "IN PROGRESS", "DONE"];
  const validPriority = ["HIGH", "MEDIUM", "LOW"];
  const validCategory = ["WORK", "HOME", "LEARNING"];
  const { id, todo, priority, status, category, dueDate } = request.body;

  if (status !== undefined) {
    if (validStatus.includes(status) === true) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }
  if (priority !== undefined) {
    if (validPriority.includes(priority) === true) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }

  if (category !== undefined) {
    if (validCategory.includes(category) === true) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }

  if (dueDate !== undefined) {
    const parsedDate = parse(dueDate, "yyyy-MM-dd", dueDate);
    const myDate = new Date(parsedDate);
    const formatedDate = format(myDate, "yyyy-MM-dd");
    console.log(formatedDate);
    const isValidDate = isValid(formatedDate);

    if (isValidDate === true) {
      request.dueDate = formatedDate;
    } else {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }

  request.id = id;
  request.todo = todo;

  next();
};

app.get("/todos/", checkRequestQuery, async (request, response) => {
  const { status = "", priority = "", search_q = "", category = "" } = request;

  const todoQuery = `select * from todo where 
                status LIKE '%${status}%' and priority LIKE '%${priority}%' and
                todo LIKE '%${search_q}%' and category LIKE '%${category}%' ;`;

  const data = await db.all(todoQuery);
  if (data !== undefined) {
    response.send(
      data.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
    );
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const todoQuery = `select * from todo where id = ${todoId};`;
  const todoDetails = await db.get(todoQuery);
  response.send(convertDbObjectToResponseObject(todoDetails));
});

app.get("/agenda/:date/", checkRequestQuery, async (request, response) => {
  const { date } = request.query;
  const todoQuery = `select * from todo where due_date = ${date};`;
  const todoDetails = await db.all(todoQuery);
  response.send(convertDbObjectToResponseObject(todoDetails));
});

app.post("/todos/", checkRequestBody, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const todoQuery = `
        INSERT INTO todo(id,todo,priority,status,category,due_date) VALUES
        ('${id}','${todo}','${priority}','${status}','${category}','${dueDate}');
    `;
  await db.run(todoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", checkRequestBody, async (request, response) => {
  const { todoId } = request.params;
  const { todo, priority, status, category, dueDate } = request.body;
  let todoQuery = "";
  switch (true) {
    case hasStatus(request.body):
      todoQuery = `UPDATE todo set status = '${status}' where id = ${todoId};`;
      response.send("Status Updated");
      break;
    case hasPriority(request.body):
      todoQuery = `UPDATE todo set priority = '${priority}' where id = ${todoId};`;
      response.send("Priority Updated");
      break;
    case hasTodo(request.body):
      todoQuery = `UPDATE todo set todo = '${todo}' where id = ${todoId};`;
      response.send("Todo Updated");
      break;
    case hasCategory(request.body):
      todoQuery = `UPDATE todo set category = '${category}' where id = ${todoId};`;
      response.send("Category Updated");
      break;
    default:
      todoQuery = `UPDATE todo set due_date = '${dueDate}' where id = ${todoId};`;
      response.send("Due Date Updated");
      break;
  }
  await db.run(todoQuery);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodo = `DELETE FROM todo where id = ${todoId};`;
  await db.run(deleteTodo);
  response.send("Todo Deleted");
});

module.exports = app;
