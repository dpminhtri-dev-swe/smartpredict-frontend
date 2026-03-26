import axios from 'axios';

const loginUser = async (email, password) => {
    return await axios.post("http://localhost:8082/api/login", {
        email,
        password,
    });
};

const registerUser = async (email, password, Hoten, roleId) => {
    return await axios.post("http://localhost:8082/api/register", {
        email,
        matKhau: password,
        Hoten,
        roleId
    });
};

export { loginUser, registerUser };

