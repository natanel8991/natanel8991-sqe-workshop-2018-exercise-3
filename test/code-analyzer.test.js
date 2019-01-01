import assert from 'assert';
import {
    FunctionParams,
    parseCode,
    SubAndEval,
    SubAndEvalLet,
    Variables,
    InitializeGlobalVariables,
    SubAndEvalPredicate,
    Substitute,ExtractFunctionParams,CreateFlowChartInputString
} from '../src/js/code-analyzer';
import * as esprima from 'esprima';

describe('evaluation part', () => {
    it('eval let expression and update the FunctionParams ', () => {
        InitializeGlobalVariables();
        SubAndEvalLet('a=6');
        assert.equal(FunctionParams.get('a').toString(),'6');
    });
    it('eval expression(=,++,[]) and update the FunctionParams ', () => {
        InitializeGlobalVariables();
        SubAndEval(esprima.parseScript('a=6;')['body'][0]);
        SubAndEval(esprima.parseScript('a++;')['body'][0]);
        assert.equal(FunctionParams.get('a').toString(),'7');
    });
});
describe('evaluation of predicate', () => {
    it('return the value of evaluation of  predicate', () => {
        InitializeGlobalVariables();
        SubAndEval(esprima.parseScript('x=4;')['body'][0]);
        let result=SubAndEvalPredicate(esprima.parseScript('function foo(){if(x<5){return x;}}')['body'][0]['body']['body'][0]);
        assert.equal(result.toString(),'true');
    });
});

describe(' give variables to evaluation part', () => {
    it('return string of variables and their values as part of the input to the eval function', () => {
        InitializeGlobalVariables();
        SubAndEvalLet('a=6');
        SubAndEvalLet('b=[1,2,3]');
        let result=Variables();
        assert.equal(result.toString(),'a=6;b=1,2,3;');
    });
});

describe(' Subtitution part', () => {
    it('substitute binary expressions and update the FunctionParams map', () => {
        InitializeGlobalVariables();
        FunctionParams.set('x',5);
        FunctionParams.set('y',6);
        FunctionParams.set('z',7);
        let result=Substitute('x+y+z');
        assert.equal(result,'5+6+7');
    });
});

describe(' ExtractFunctionParams part', () => {
    it('function without parameters', () => {
        InitializeGlobalVariables();
        ExtractFunctionParams(esprima.parseScript('function foo(){return 1;}')['body'][0],'')
        assert.equal(FunctionParams.size.toString(),'0');
    });
    it('function with only 1 parameter', () => {
        InitializeGlobalVariables();
        ExtractFunctionParams(esprima.parseScript('function foo(x){return 1;}')['body'][0],'1')
        assert.equal(FunctionParams.get('x'),'1');
    });
    it('function with more than 1 parameter', () => {
        InitializeGlobalVariables();
        ExtractFunctionParams(esprima.parseScript('function foo(x,y){return 1;}')['body'][0],'1,2')
        assert.equal(FunctionParams.get('x')+FunctionParams.get('y'),'12');
    });
});

describe('simple code test ', () => {
    it('function with only one expression', () => {
        let result=CreateFlowChartInputString('function foo(x){let a = x + 1;}','1');
        assert.equal(result,'st=>start: Start\n' +
            'op1=>operation: #1\n' +
            ' a = x + 1|approved\n' +
            'st->op1');
    });

    it('function with if elseif', () => {
        let result=CreateFlowChartInputString('function foo(x, y, z){let a = x + 1;let b = a + y;let c = 0;if (b < z) {c = c + 5;} else if (b < z * 2) {c = c + x + 5;} else {c = c + z + 5;}return c;}','1,2,3');
        assert.equal(result,'st=>start: Start\n' + 'op1=>operation: #1\n' + ' a = x + 1|approved\n' + 'op2=>operation: #2\n' + ' b = a + y|approved\n' + 'op3=>operation: #3\n' + ' c = 0|approved\n' + 'cond4=>condition: #4\n' + 'b < z|approved\n' + 'op5=>operation: #5\n' + 'c = c + 5\n' + 'cond6=>condition: #6\n' + 'b < z * 2|approved\n' + 'op7=>operation: #7\n' + 'c = c + x + 5|approved\n' + 'op8=>operation: #8\n' + 'c = c + z + 5\n' + 'op9=>operation: #9\n' + 'return  c;|approved\n' + 'st->op1->op2->op3->cond4(yes)->op5->op9\n' + ' cond4(no,right)->cond6(yes)->op7->op9\n' + ' cond6(no,right)->op8->op9');
    });

    it('function with while ', () => {
        let result=CreateFlowChartInputString('function foo(x){while(x[0]<6){let a=7;a++;x[1]=a;}}','1');
        assert.equal(result,'st=>start: Start\n' + 'op1=>operation: #1\n' + 'NULL|approved\n' + 'cond2=>condition: #2\n' + 'x[0] < 6|approved\n' + 'op3=>operation: #3\n' + ' a = 7\n' + 'op4=>operation: #4\n' + 'a++\n' + 'op5=>operation: #5\n' + 'x[1] = a\n' + 'st->op1->cond2\n' + ' cond2(yes)->op3->op4->op5(right)->op1\n' + ' cond2(no,buttom)');
    });


});





