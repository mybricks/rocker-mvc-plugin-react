"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const path = require("path");
const data = [[{
            render: [
                { path: path.join(__dirname, `./TT.tsx`) }
            ]
        }]];
index_1.default({
    wrapper: './tpt.ejs'
})(data);
setTimeout(h => {
    const compile = data[0][0].render[0].compile();
    const content = compile({ msg: '22222222' });
    debugger;
}, 5000);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx3Q0FBZ0M7QUFDaEMsNkJBQTZCO0FBRTdCLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQztZQUNiLE1BQU0sRUFBRTtnQkFDTixFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBQzthQUN6QztTQUNGLENBQUMsQ0FBQyxDQUFBO0FBRUgsZUFBSyxDQUFDO0lBQ0osT0FBTyxFQUFFLFdBQVc7Q0FDckIsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO0FBRVIsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQ2IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUM5QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsRUFBQyxHQUFHLEVBQUMsVUFBVSxFQUFDLENBQUMsQ0FBQTtJQUN6QyxRQUFRLENBQUE7QUFDVixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUEifQ==