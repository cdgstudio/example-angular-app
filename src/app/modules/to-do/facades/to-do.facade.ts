import { Injectable } from '@angular/core';
import { map, Observable, ReplaySubject, switchMap, take, tap } from 'rxjs';
import { ToDoApiService } from '../api/to-do-api.service';
import { ToDo } from '../api/to-do.models';

@Injectable({
  providedIn: 'root',
})
export class ToDoFacade {
  toDos$ = new ReplaySubject<ToDo[]>(1);

  constructor(private toDoApiService: ToDoApiService) {}

  setFilters(filters: Record<string, any> = {}): Observable<void> {
    const statuses = [];
    if (filters['statusTodo'] === true) {
      statuses.push('TO_DO');
    }
    if (filters['statusDone'] === true) {
      statuses.push('DONE');
    }
    if (filters['statusRemoved'] === true) {
      statuses.push('REMOVED');
    }

    if (statuses.length > 0) {
      filters = { ...filters, statuses: statuses };
    }

    return this.toDoApiService.getToDos(filters).pipe(
      tap((toDos) => this.toDos$.next(toDos)),
      map(() => void 0),
    );
  }

  markAsDone(toDo: ToDo): Observable<void> {
    return this.toDoApiService.markAsDone(toDo).pipe(
      switchMap((doneToDo) => this.replaceToDo(doneToDo)),
      map(() => void 0),
    );
  }

  markAsToDo(toDo: ToDo): Observable<void> {
    return this.toDoApiService.markAsToDo(toDo).pipe(
      switchMap((doneToDo) => this.replaceToDo(doneToDo)),
      map(() => void 0),
    );
  }

  private replaceToDo(newToDo: ToDo): Observable<void> {
    return this.toDos$.pipe(
      take(1),
      tap((toDos) => {
        const index = toDos.findIndex((internalToDo) => internalToDo.id === newToDo.id);
        const newArray = [...toDos.slice(0, index), newToDo, ...toDos.slice(index + 1)];
        this.toDos$.next(newArray);
      }),
      map(() => void 0),
    );
  }
}
