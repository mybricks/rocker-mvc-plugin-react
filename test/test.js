"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const path = require("path");
const data = [[{
            render: [
                { path: path.join(__dirname, `./TT.tsx`) }
            ]
        }]];
(0, index_1.default)({
    wrapper: './tpt.ejs'
})(data);
setTimeout(h => {
    const compile = data[0][0].render[0].compile();
    const content = compile({ msg: '22222222' });
    debugger;
}, 5000);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx3Q0FBZ0M7QUFDaEMsNkJBQTZCO0FBRTdCLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQztZQUNiLE1BQU0sRUFBRTtnQkFDTixFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBQzthQUN6QztTQUNGLENBQUMsQ0FBQyxDQUFBO0FBRUgsSUFBQSxlQUFLLEVBQUM7SUFDSixPQUFPLEVBQUUsV0FBVztDQUNyQixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7QUFFUixVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7SUFDYixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzlDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxFQUFDLEdBQUcsRUFBQyxVQUFVLEVBQUMsQ0FBQyxDQUFBO0lBQ3pDLFFBQVEsQ0FBQTtBQUNWLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQSJ9