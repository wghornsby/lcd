logg('DB');

class User extends _Rec {
  /*
   user_id
   email
   pw 
   Roles
   */
  init(o) {
    this.mix(o);
    this.Roles = new Roles(this.Roles);
  }
}
class Roles extends _RecArray {
  init(a) {
    this.load(a, Role);
  }
}
class Role extends _Rec {
  /*
   role_id
   role_name
   */
  init(o) {
    this.mix(o);
  }
}

var mydb = LocalDb.open('Test-1.0');
mydb.drop();

if (! mydb.table('USERS')) {
  mydb.createTable('USERS', 'user_id');
  mydb.insert('USERS').values([
    {'email':'wghornsby@gmail.com','pw':'HASH1'},
    {'email':'doctor@med.md','pw':'HASH2'}
  ])
}
if (! mydb.table('ROLES')) {
  mydb.createTable('ROLES', 'role_id');
  mydb.insert('ROLES').values([
    {'name':'SYSADMIN'},
    {'name':'DOCTOR'}
  ])
  var r = mydb.insert('ROLES').values({'name':'ADMIN'});
  log(r);
}
  
if (! mydb.table('USER_ROLES')) {
  mydb.createTable('USER_ROLES', 'user_role_id');
  mydb.insert('USER_ROLES').values([
    {'user_id':1,'role_id':1},
    {'user_id':2,'role_id':2},
    {'user_id':2,'role_id':3}
  ])
}

var me = {};
var rows;
rows = mydb.select('USERS').where(user => user.email == 'doctor@med.md');
log(rows);
if (rows.length) {
  var row = rows[0];
  row.Roles = [];
  rows = mydb.select('USER_ROLES').where(userRole => userRole.user_id == row.user_id);
  rows.all(rowUserRole => {
    row.Roles.push(mydb.select('ROLES').pk(rowUserRole.role_id)); 
  })
  me.user = new User(row);
}
log(me.user);

log('PETS');

if (mydb.table('PETS')) {
  mydb.dropTable('PETS');
}
mydb.createTable('PETS', 'pet_id');
mydb.insert('PETS').values([
  {'name':'Butter','type':'dog','age':12},
  {'name':'Bear','type':'dog','age':6},
  {'name':'Dewey','type':'cat','age':8}
])

rows = mydb.select('PETS').where(pet => pet.age >= 8);
log(rows);

row = mydb.insert('PETS').values({'name':'Millie','type':'kitten','age':1});
log(row);
rows = mydb.select('PETS').where();
log(rows);
row = mydb.select('PETS').pk(4);
log(row);

log('UPDATE');

row = mydb.update('PETS').values({'pet_id':4,'age':2,'type':'cat'});
log(row);

mydb.update('PETS').set(row => {row.age = row.age + 1}).where(row => row.type == 'dog');
rows = mydb.select('PETS').where();
log(rows);

log('DELETE');

mydb.delete('PETS').pk(3);
log(mydb.table('PETS')._pks);
rows = mydb.select('PETS').where();
log(rows);

mydb.delete('PETS').where(pet => pet.type == 'dog');
rows = mydb.select('PETS').where();
log(rows);

row = mydb.insert('PETS').values({'name':'Louie','type':'cat','age':8});
rows = mydb.select('PETS').where();
log(rows);

//mydb.drop();

logg(1);


/**

Test-1.0.tables {'USERS':'user_id','ROLES':'role_id','USER_ROLE':'user_role_id'}
Test-1.0.table.USERS.stats {
  npk:3,
  pk:[1,2]
}
Test-1.0.table.USERS.1 {user_id:1,user:'wghornsby@gmail.com',pw:'HASH'}



*/

