# Watson Solutions Lab

## Authentication Module

This is a module that provides you the capability needed to login, logout and maintain the Loopback token required for subsequent api called to the server.  The module is structured to support other forms of authentication at a later point.

The module consist of the following components and services.

### Loopback Login Component
Provides a login form with validation to capture username and password required for the api/login call.
### Loopback Login Service
A service that will make the calls to Loopback and maintain the token in session storage.

### Usage
You can add the login component selector to any other template by using the following element.
```
<wsl-lb-login></wsl-lb-login>
```
But probably a better idea is to use the login component in a router.

You can also inject the Login Service to access the token in session storage or access it directly using the following syntax.
```
sessionStorage.getItem('wsl-api-token');
```
The HomeComponent contains an example of accessing the LoginService directly.
