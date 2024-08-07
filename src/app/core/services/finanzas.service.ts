import { inject, Injectable } from '@angular/core';
import { LoginService } from './login.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, catchError, filter, map, Observable, tap, throwError } from 'rxjs';
import { Transaction } from '../models/Transaction';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FinanzasService {
  private loginService = inject(LoginService);
  private http = inject(HttpClient);
  
  userLoginOn: boolean = false;
  transactions: BehaviorSubject<Transaction[]> = new BehaviorSubject<Transaction[]>(
    []
  );
  errorMessage: String = '';

  constructor() {
    this.loginService.userLoginOn.subscribe({
      next: (userLoginOn) => {
        this.userLoginOn = userLoginOn;
      },
      error: (errorData) => {
        this.errorMessage = errorData;
      },
      complete: () => {
        console.info('User Data ok');
      },
    });
  }

  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(environment.urlApi + '/finances/transactions/').pipe(
      tap((userData) => {
        this.transactions.next(userData);
      }),
      map((userData)=> userData),
      catchError(this.handleError)
    );
  }

  getIngresosDelDia(): Observable <Transaction[]>{
    return this.getTransactions().pipe(
      map( (ingreso)=> ingreso.filter( transaccion => transaccion.type == "income") ),
      map( (ingresos)=> this.filterByDate( ingresos, 'day') )
    );
  }

  getIngresosDeLaSemana(): Observable <Transaction[]>{
    return this.getTransactions().pipe(
      map( (ingreso)=> ingreso.filter( transaccion => transaccion.type === "income") ),
      map( (ingresos)=> this.filterByDate( ingresos, 'week') )
    );
  }

  getIngresosDelMes(): Observable <Transaction[]>{
    return this.getTransactions().pipe(
      map( (ingreso)=> ingreso.filter( transaccion => transaccion.type === "income") ),
      map( (ingresos)=> this.filterByDate( ingresos, 'month') )
    );
  }

  //GASTOS
  getGastosdelMes(): Observable<Transaction[]> {
    return this.getTransactions().pipe(
      map((gastos) => gastos.filter(transaccion => transaccion.type == "spend")),
      map((gastos) => this.filterByDate(gastos, 'month')),
    );
  }

  getGastosPorMotivo(motivo: string): Observable<Transaction[]> {
    return this.getTransactions().pipe(
      map((gastos) => gastos.filter(transaccion => transaccion.type == "spend")),
      map((gastos) => this.filterByDate(gastos, 'month')),
      map((gastos)=> gastos.filter(transaccion => transaccion.origin ==  motivo))
    );
  }

  addTransaction(transaction: Transaction): Observable<Transaction> {
    return this.http
      .post<Transaction>(environment.urlApi + '/finances/transactions/', transaction)
      .pipe(
        tap((userData) => {
          const currentTransactions = this.transactions.getValue();
          currentTransactions.push(userData);
          this.transactions.next(currentTransactions);
        }),
        map((userData) => userData),
        catchError(this.handleError)
      );
  }

  updateTransaction(transaction: Transaction) {
    return this.http
      .put<Transaction>(
        environment.urlApi + '/finances/transactions/' + transaction.id,
        transaction
      )
      .pipe(
        tap((userData) => {
          const currentTransactions = this.transactions.getValue();
          const indiceTransaction = currentTransactions.findIndex(
            (transactionInArray) => transactionInArray.id == transaction.id
          );
          currentTransactions[indiceTransaction] = userData;
          this.transactions.next(currentTransactions);
        }),
        map((userData) => userData),
        catchError(this.handleError)
      );
  }


  private handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      console.error('se ha producido un error', error);
    } else {
      console.error(
        'Backend retorno el codigo de estado: ',
        error.status,
        error.error
      );
    }
    return throwError(
      () => new Error('Algo fallo. Por favor intente de nuevo')
    );
  }



  private filterByDate( transacciones: Transaction[], period: 'day' | 'week' | 'month'): Transaction[]{
    const now = new Date();
    
    return transacciones.filter( transaction =>{
      const transaccionDate = new Date( transaction.date+"T00:00:00"); // todo para verificar horario GTM /UTC      
      switch (period) {
        case 'day':
          return transaccionDate.toDateString() === now.toDateString();

        case 'week':
          const startOfWeek = new Date(now);//Crea inicio de semana
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);//Crea final de semana
          endOfWeek.setDate(startOfWeek.getDate() + 7);

          return transaccionDate >= startOfWeek && transaccionDate < endOfWeek;

        case 'month':
          return transaccionDate.getMonth() === now.getMonth() && transaccionDate.getFullYear() === now.getFullYear();

        default:
          return false;
      }

    });

  }

}
