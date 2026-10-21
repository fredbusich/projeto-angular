import { Pipe, PipeTransform } from '@angular/core';
import { TraducaoService } from '../servicos/traducao-service';

// Pipe nosso: mostra o nome do exercício na língua escolhida (português ou inglês).
//   {{ 'Barbell bench press' | nomeExercicio }}  ->  "Supino com barra"  (ou o original, em inglês)
//
// pure: false — um pipe "puro" só volta a correr quando o valor de entrada muda. Aqui o nome
// não muda, o que muda é a língua; por isso o pipe corre sempre que o ecrã é atualizado
// (é só uma consulta numa tabela, muito rápida).
@Pipe({ name: 'nomeExercicio', pure: false })
export class NomeExercicioPipe implements PipeTransform {
  constructor(private traducao: TraducaoService) {}

  transform(nomeIngles: string): string {
    return this.traducao.nome(nomeIngles);
  }
}
