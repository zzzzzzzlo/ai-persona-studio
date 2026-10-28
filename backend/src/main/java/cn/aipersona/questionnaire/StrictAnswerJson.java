package cn.aipersona.questionnaire;
import com.fasterxml.jackson.databind.cfg.*;
import com.fasterxml.jackson.databind.type.LogicalType;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.*;
@Configuration
class StrictAnswerJson {
    @Bean Jackson2ObjectMapperBuilderCustomizer strictText(){return builder->builder.postConfigurer(mapper->{
        var coercion=mapper.coercionConfigFor(LogicalType.Textual);
        for(var shape:new CoercionInputShape[]{CoercionInputShape.Integer,CoercionInputShape.Float,CoercionInputShape.Boolean})coercion.setCoercion(shape,CoercionAction.Fail);
        for(var shape:new CoercionInputShape[]{CoercionInputShape.String,CoercionInputShape.Integer,CoercionInputShape.Float})mapper.coercionConfigFor(LogicalType.Boolean).setCoercion(shape,CoercionAction.Fail);
        for(var shape:new CoercionInputShape[]{CoercionInputShape.String,CoercionInputShape.Float,CoercionInputShape.Boolean})mapper.coercionConfigFor(LogicalType.Integer).setCoercion(shape,CoercionAction.Fail);
    });}
}
