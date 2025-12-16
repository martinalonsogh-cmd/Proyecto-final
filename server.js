const express = require ('express');
const session = require('express-session');
const multer = require('multer');
const xlsx = require('xlsx'); 
const bcrypt = require('bcrypt');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const upload = multer({ dest: 'uploads/' });

require('dotenv').config();
// Configuración de la sesión
app.use(session({
  secret: 'secretKey',
  resave: false,
  saveUninitialized: false,
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json())

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  next();
}

function requireRole(allowedRoles) {
    return (req, res, next) => {
        console.log('=== DEBUG requireRole ===');
        console.log('Session user:', req.session.user);
        console.log('User role:', req.session.user?.tipo_usuario);
        console.log('Allowed roles:', allowedRoles);
        
        if (!req.session.user) {
            console.log('No user in session');
            return res.redirect('/login.html');
        }
        
        const userRole = req.session.user.tipo_usuario;
        console.log('User role found:', userRole);
        
        if (!userRole) {
            console.log('User has no role assigned');
            return res.status(403).send('Usuario sin rol asignado');
        }
        
        // Convertir roles a mayúsculas para comparación consistente
        const userRoleUpper = userRole.toUpperCase();
        const allowedRolesUpper = Array.isArray(allowedRoles) 
            ? allowedRoles.map(role => role.toUpperCase())
            : allowedRoles.toUpperCase();
        
        // Si allowedRoles es array
        if (Array.isArray(allowedRoles)) {
            if (allowedRolesUpper.includes(userRoleUpper)) {
                console.log('Access GRANTED - role in allowed list');
                next();
            } else {
                console.log('Access DENIED - role not in allowed list');
                res.status(403).send(`
                    <html>
                    <head><link rel="stylesheet" href="/styles.css"></head>
                    <body>
                        <h2>Acceso Denegado</h2>
                        <p>Rol actual: <strong>${userRole}</strong></p>
                        <p>Roles permitidos: <strong>${allowedRoles.join(', ')}</strong></p>
                        <button onclick="window.location.href='/'">Volver</button>
                    </body>
                    </html>
                `);
            }
        } 
        // Si es string
        else {
            if (userRoleUpper === allowedRolesUpper) {
                console.log('Acceso habilitado - rol permitido');
                next();
            } else {
                console.log('Acceso Denegado - Rol no permitido');
                res.status(403).send(`
                    <html>
                    <head><link rel="stylesheet" href="/styles.css"></head>
                    <body>
                        <h2>Acceso Denegado</h2>
                        <p>Rol actual: <strong>${userRole}</strong></p>
                        <p>Rol requerido: <strong>${allowedRoles}</strong></p>
                        <button onclick="window.location.href='/'">Volver</button>
                    </body>
                    </html>
                `);
            }
        }
    };
}

// Servir archivos estáticos (HTML)
app.use(express.static(path.join(__dirname, 'public'),{
  index:false
}));

// Configurar conexión a MySQL
const connection = mysql.createConnection({
  host: process.env.DB_HOST,   //host desde. env
  user: process.env.DB_USER,    // Usuario desde .env 
  password: process.env.DB_PASS, // Contrasena desde .env
  database: process.env.DB_NAME,  // Nombre de la base de datos desde .env 
});

connection.connect(err => {
  if (err) {
    console.error('Error conectando a MySQL:', err);
    return;
  }
  console.log('Conexión exitosa a MySQL');
});

// Rutas Publicas 

// Recibir la pagina login  
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
// Recibir la pagina registro 
app.get('/registro', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'registro.html'));
});
// Ruta princiap protegida 
app.get('/', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));                                    
});
// Ruta d registro 
app.post('/registro', (req, res) => {
        console.log('POST /registro');
        console.log(req.body);

    const { username, correo, password, codigo_acceso } = req.body;

    const query = 'SELECT rol FROM codigos_acceso WHERE codigo = ?';
    connection.query(query, [codigo_acceso], (err, results) => {
        if (err || results.length === 0) {
            let html = `<html>  
                <head>
                    <link rel="stylesheet" href="/styles.css">
                    <title>Medicos</title>
                </head>
                <body>
                    <p></p>
                    <h4>Error de Operacion</h4>
                    <p></p>
                    <h3>Codigo de acceso Erroneo</h3>
                    <p></p>
                    <button onclick="window.location.href='/'">Regresar</button>
                </body>
            </html>`;
            return res.send(html);
        }

        const rol = results[0].rol.toUpperCase().trim();

        const hashedPassword = bcrypt.hashSync(password, 10);

       const insertUser =
  'INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES (?, ?, ?, ?)';


        connection.query(insertUser, [username, correo, hashedPassword, rol], (err) => {
            if (err) {
                let html = `<html>
                    <head>
                        <link rel="stylesheet" href="/styles.css">
                        <title>Medicos</title>
                    </head>
                    <body>
                        <p></p>
                        <h4>Error de Operacion</h4>
                        <p></p>
                        <h3>Error al registrar usuario</h3>
                        <p></p>
                        <button onclick="window.location.href='/'">Regresar</button>
                    </body>
                </html>`;
                return res.send(html);
            }
            res.redirect('/login.html');
        });
    });
});
// Iniciar sesión
app.post('/login', (req, res) => {
    const { nombre_usuario, password } = req.body;
    console.log(req.body);

    const query = 'SELECT * FROM usuarios WHERE nombre = ?';
    connection.query(query, [nombre_usuario], (err, results) => {
        if (err) {
          let html =`<html>
          <head>
            <link rel="stylesheet" href="/styles.css">
            <title>Medicos</title>
          </head>
          <body>
            <p></p>
            <h4>Error de Operacion</h4>
            <p></p>
            <h3> No se pudo obtener al usuario  </h3>
            <p></p>
            <button onclick="window.location.href='/'">Regresar</button>
          </body>
          </html>
      
      
          </html>`;
          
          return res.send(html);
        }

        if (results.length === 0) {
           let html =`<html>
          <head>
            <link rel="stylesheet" href="/styles.css">
            <title>Medicos</title>
          </head>
          <body>
            <p></p>
            <h4>Error de Operacion</h4>
            <p></p>
            <h3> No se pudo obtener al usuario  </h3>
            <p></p>
            <button onclick="window.location.href='/'">Regresar</button>
          </body>
          </html>
          
          
          </html>`;
            return res.send(html);
        }

        const user = results[0];

        const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
        if (!isPasswordValid) {
          let html =`<html>
          <head>
            <link rel="stylesheet" href="/styles.css">
            <title>Medicos</title>
          </head>
          <body>
            <p></p>
            <h4>Error de Operacion</h4>
            <p></p>
            <h3> Contrasena incorrecta  </h3>
            <p></p>
            <button onclick="window.location.href='/'">Regresar</button>
          </body>
          </html>
          
          
          </html>`;

            return res.send(html);
        }

        req.session.user = {
         id: user.id,
           username: user.nombre,
          tipo_usuario: user.rol
        };


        res.redirect('/');
    });
});

// Cerrar sesión
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Ruta para obtener el tipo de usuario actual
app.get('/tipo-usuario', requireLogin, (req, res) => {
    res.json({ tipo_usuario: req.session.user.tipo_usuario });
});

app.get('/menu', (req, res) => {
  const menuItems = [
    { nombre: 'Inicio', url: '/' },
    { nombre: 'Instrumentos', url: '/protesis.html' },
    { nombre: 'Registrar Prótesis', url: '/registrar_protesis' },
    { nombre: 'Dispositivos Médicos', url: '/dispositivos_medicos.html' },
    { nombre: 'Registrar Dispositivo', url: '/registrar_dispositivo' },
    { nombre: 'Cerrar Sesión', url: '/logout' }
  ];
  res.json(menuItems);
});





// Ruta para guardar datos en la base de datos
app.post('/subir_instrumento', requireLogin ,requireRole(['ADMIN','ASISTENTE']),(req, res) => {
  const { nombre_instrumento, categoria_instrumento, estado_instrumento, ubicacion_instrumento} = req.body;
  
  const query = 'INSERT INTO instrumentos (nombre, categoria, estado , ubicacion ) VALUES (?, ?, ?, ?)';
  connection.query(query, [nombre_instrumento, categoria_instrumento, estado_instrumento, ubicacion_instrumento], (err, result) => {
    
    if (err) {
      let html =`<html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>instrumentos</title>
      </head>
      <body>
         <p></p>
        <h4>Error de Operacion</h4>
        <p></p>
        <h3> No se ingresaron correctamente los datos.  </h3>
        <p></p>
        <button onclick="window.location.href='/'">Regresar</button>
      </body>
      </html>
      
      
      </html>`;
      return res.send(html);
      
    }
    let html = `
      <html>
      <head>
        <link rel="stylesheet" href="/styles.css">
        <title>Instrumentos</title>
      </head>
      <body>
         <p></p>
        <h2>Protesis registrada</h2>
        <p></p>
        <h3>El instrumento ${nombre_instrumento} ha sido registrado correctamente.</h3>
        <p></p>
        <button onclick="window.location.href='/'">Regresar</button>
      </body>
      </html>
    `;
    res.send(html);
  });
  
});

//dispositivos medicos
app.post('/subir_dispositivo', requireLogin, requireRole(['ADMIN','ASISTENTE']), (req, res) => {
  const { nombre, categoria, estado, ubicacion } = req.body;

  const sql = `
    INSERT INTO dispositivos_medicos (nombre, categoria, estado, ubicacion)
    VALUES (?, ?, ?, ?)
  `;

  connection.query(sql, [nombre, categoria, estado, ubicacion], (err) => {
    if (err) return res.send('Error al guardar dispositivo');
    res.redirect('/dispositivos_medicos.html');
  });
});


// Búsqueda en vivo de instrumentos


app.delete('/api/instrumentos/:id', requireLogin, requireRole('ADMIN'), (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM instrumentos WHERE id = ?';
    connection.query(sql, [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al eliminar instrumento' });
        }
        res.json({ success: true });
    });
});

// busqueda en vivo de dispositivos medicos 
app.get('/api/dispositivos/buscar', requireLogin, (req, res) => {
  const q = `%${req.query.q || ''}%`;

  const sql = `
    SELECT * FROM dispositivos_medicos
    WHERE nombre LIKE ?
       OR categoria LIKE ?
       OR estado LIKE ?
       OR ubicacion LIKE ?
  `;

  connection.query(sql, [q,q,q,q], (err, results) => {
    if (err) return res.status(500).json([]);
    res.json(results);
  });
});

app.delete('/api/dispositivos_medicos/:id',
  requireLogin,
  requireRole('ADMIN'),
  (req, res) => {

  const { id } = req.params;
  const sql = 'DELETE FROM dispositivos_medicos WHERE id = ?';

  connection.query(sql, [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al eliminar dispositivo médico' });
    }
    res.json({ success: true });
  });
});

app.put('/api/dispositivos_medicos/:id/estado',
  requireLogin,
  requireRole('ADMIN'),
  (req, res) => {

  const { id } = req.params;
  const { nuevo_estado } = req.body;

  if (!nuevo_estado) {
    return res.status(400).json({ error: 'nuevo_estado es obligatorio' });
  }

  const sql = 'UPDATE dispositivos_medicos SET estado = ? WHERE id = ?';

  connection.query(sql, [nuevo_estado, id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al actualizar estado' });
    }
    res.json({ success: true });
  });
});


// Descargar lista de instrumentos 
app.get('/descarga_instrumentos',requireLogin, requireRole(['ADMIN','ASISTENTE','AUDITOR']), (req, res) => {
  const sql = `SELECT * FROM instrumentos`;
  connection.query(sql, (err, results) => {
    if (err) throw err;

    const worksheet = xlsx.utils.json_to_sheet(results);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'instrumentos');

    const filePath = path.join(__dirname, 'uploads', 'instrumentos.xlsx');

    xlsx.writeFile(workbook, filePath);
    res.download(filePath, 'Lista Instrumentos.xlsx');
  });
});

//descargar dispositivos
app.get(
  '/descarga_dispositivos_medicos',
  requireLogin,
  requireRole(['ADMIN','ASISTENTE','AUDITOR']),
  (req, res) => {

  const sql = 'SELECT * FROM dispositivos_medicos';

  connection.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al generar archivo');
    }

    const worksheet = xlsx.utils.json_to_sheet(results);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'dispositivos_medicos');

    const filePath = path.join(__dirname, 'uploads', 'dispositivos_medicos.xlsx');

    xlsx.writeFile(workbook, filePath);
    res.download(filePath, 'Lista_Dispositivos_Medicos.xlsx');
  });
});

// Página para registrar prótesis
app.get(
  '/registrar_protesis',
  requireLogin,
  requireRole(['ADMIN','ASISTENTE']),
  (req, res) => {
    res.sendFile(
      path.join(__dirname, 'public', 'registrar_protesis.html')
    );
  }
);

app.get(
  '/registrar_dispositivo',
  requireLogin,
  requireRole(['ADMIN','ASISTENTE']),
  (req, res) => {
    res.sendFile(
      path.join(__dirname, 'public', 'registrar_dispositivo.html')
    );
  }
);


//ruta para manejar la carga de paciente 

app.post(
  '/cargar_instrumento',
  requireLogin,
  requireRole(['ADMIN','ASISTENTE']),
  upload.single('excelFile'),
  (req, res) => {

  const filePath = req.file.path;
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  data.forEach(row => {

    //CAMBIO SUTIL: Usar los nombres correctos de las columnas
    const { Nombre, Categoria, Estado, Ubicacion } = row;
    const sql = `INSERT INTO instrumentos (nombre, categoria, estado, ubicacion) VALUES (?, ?, ?, ?)`;
    connection.query(sql, [Nombre, Categoria, Estado, Ubicacion], err => {
      if (err) throw err;
    });
  });

  res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
      <meta charset="UTF-8">
       <title>Archivo cargado</title>
       <link rel="stylesheet" href="/styles.css">
       </head>
      <body>
        <h1>Archivo cargado y datos guardados</h1>
       <button onclick="window.location.href='/'">Volver</button>
      </body>
      </html>
    `);
});

// BUSQUEDA EN VIVO DE INSTRUMENTOS
app.get('/api/instrumentos/buscar', requireLogin, requireRole(['ADMIN','ASISTENTE','AUDITOR']), (req, res) => {
    const q = req.query.q || '';

    const sql = `
        SELECT id, nombre, categoria, estado, ubicacion
        FROM instrumentos
        WHERE nombre LIKE ? 
           OR categoria LIKE ? 
           OR estado LIKE ?
           OR ubicacion LIKE ?
        LIMIT 20
    `;

    const like = `%${q}%`;

    connection.query(sql, [like, like, like, like], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la consulta' });
        }
        res.json(results);
    });
});

// Actualizar estado de un instrumento
app.put('/api/instrumentos/:id/estado', requireLogin, requireRole('ADMIN'), (req, res) => {
  const { id } = req.params;
  const { nuevo_estado } = req.body;

  if (!nuevo_estado) {
    return res.status(400).json({ error: "El campo 'nuevo_estado' es obligatorio" });
  }

  const sql = `UPDATE instrumentos SET estado = ? WHERE id = ?`;

  connection.query(sql, [nuevo_estado, id], (err, result) => {
    if (err) {
      console.error("Error actualizando estado:", err);
      return res.status(500).json({ error: "No se pudo actualizar el estado" });
    }

    res.json({ success: true, message: "Estado actualizado correctamente" });
  });
});


// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});