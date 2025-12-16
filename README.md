# Sistema de Gestión de Almacenes Medtronic – Tijuana

Sistema web para la gestión y control de dispositivos médicos y prótesis en almacenes de Medtronic ubicados en Tijuana.

## Descripción del proyecto

Este proyecto es una aplicación web desarrollada con **Node.js, Express y MySQL** cuyo objetivo es apoyar a Medtronic en la **organización de sus almacenes**, permitiendo llevar un control claro de los dispositivos médicos, prótesis, su estado y la instalación en la que se encuentran.

El sistema implementa **roles de usuario** para asegurar que cada persona tenga acceso únicamente a las funciones que le corresponden, mejorando la seguridad y confiabilidad de la información.

## Objetivos

### Permitir a los usuarios según su rol:

#### Administrador
- Registrar y eliminar dispositivos médicos y prótesis.
- Modificar el estado de los instrumentos.
- Gestionar usuarios mediante códigos de acceso.
- Descargar reportes en Excel.
- Visualizar y controlar toda la información del sistema.

#### Asistente
- Registrar dispositivos médicos y prótesis.
- Consultar inventario.
- Descargar reportes.
- Actualizar estados permitidos.

#### Auditor
- Consultar inventario.
- Realizar búsquedas.
- Descargar reportes para revisión.
- No puede registrar, editar ni eliminar información.

## Funcionalidades principales

- Registro e inicio de sesión con roles.
- Control de acceso por permisos.
- Gestión de dispositivos médicos y prótesis.
- Búsqueda en tiempo real.
- Exportación de datos a archivos Excel.
- Carga masiva de instrumentos mediante archivos `.xlsx`.
- Sistema de sesiones con protección de rutas.
- Interfaz web simple y funcional.

## Tecnologías utilizadas

**Backend**
- Node.js
- Express
- MySQL
- express-session
- bcrypt
- multer
- xlsx

**Frontend**
- HTML5
- CSS3
- JavaScript

## Estructura del proyecto

