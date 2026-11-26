<?php

namespace App\Http\Controllers;

use App\Services\AiAssistant;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;
use Illuminate\Http\Client\ConnectionException;

class AiController extends Controller
{


    public function __construct(private AiAssistant $ai) {}

    public function ask(Request $request)
    {
        $request->validate(['question' => ['required', 'string', 'min:5', 'max:500']]);

        return $this->respond($request, 'Pregunta del usuario: ' . $request->input('question'));
    }

    public function summary(Request $request)
    {
        return $this->respond(
            $request,
            'Redacta un resumen ejecutivo del periodo: ventas totales, cambio contra el periodo anterior, '
            . 'sucursal más fuerte y más débil, mejor categoría por margen y un punto de atención.'
        );
    }

    private function respond(Request $request, string $instruction)
    {
        set_time_limit(90); // la llamada al LLM puede tardar más que los 30 s por defecto

        $context = $this->ai->context($request);

        // Si los filtros son inválidos, la validación responde 422 antes de llamar a la IA
        $context = $this->ai->context($request);

        try {
            $answer = $this->ai->answer($instruction, $context);
            
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 503);
            } catch (ConnectionException $e) {
    return response()->json([
        'message' => 'El asistente de IA tardó demasiado en responder. Intenta de nuevo.',
    ], 503);
            
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'No se pudo consultar al asistente de IA. El resto del sistema sigue funcionando.',
            ], 503);
        }

        return response()->json([
            'answer' => $answer,
            'period' => $context['periodo'],
        ]);
    }
}