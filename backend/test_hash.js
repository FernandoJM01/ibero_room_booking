const bcrypt = require('bcryptjs');
const hash = '$2b$10$4Imio4htsQ4w0fo2aku7wOy8PFusDeuCNATsl/2i4y3TC.l.2jmBK';
const pass = 'Admin123!';
console.log("Match?", bcrypt.compareSync(pass, hash));
