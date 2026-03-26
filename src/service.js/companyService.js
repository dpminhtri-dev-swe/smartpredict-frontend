import axios from 'axios';

const getListCompany = async (page, limit) => {
    return await axios.get(`http://localhost:8082/api/companies?page=${page}&limit=${limit}`);
};

const getCompanyById = async (id) => {
    return await axios.get(`http://localhost:8082/api/companies/${id}`);
};

const searchCompany = async (keyword, page, limit) => {
    return await axios.get(`http://localhost:8082/api/companies/search?keyword=${keyword}&page=${page}&limit=${limit}`);
};

export { getListCompany, getCompanyById, searchCompany };

