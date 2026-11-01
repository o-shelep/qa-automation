/* v8 ignore file -- точка запуску сервера для Postman, у тестах не виконується */
import { createApp } from './app';

createApp().listen(3000, () => console.log('http://localhost:3000'));